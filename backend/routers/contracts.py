import os
import tempfile
from datetime import datetime, timezone
from bson import ObjectId
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, BackgroundTasks
from db import get_db

try:
    from lib.auth_dep import get_current_user_id
    from lib.ingestion import ingest_file
    from lib.classifier import classify_contract
except ImportError:
    from backend.lib.auth_dep import get_current_user_id
    from backend.lib.ingestion import ingest_file
    from backend.lib.classifier import classify_contract

router = APIRouter()

def process_ingestion(contract_id: str, temp_path: str, filename: str):
    db = get_db()
    try:
        # 1. Ingest file
        full_text, sections = ingest_file(temp_path, filename)
        
        try:
            from lib.extractor import extract_contract, resolve_amounts, save_milestones, is_review_required
        except ImportError:
            from backend.lib.extractor import extract_contract, resolve_amounts, save_milestones, is_review_required
            
        # 2. Extract everything in one Groq call
        extracted_data = extract_contract(full_text)
        
        contract_type = extracted_data.get("contract_type", "unsupported")
        project_value = extracted_data.get("project_value")
        project_value_confidence = extracted_data.get("project_value_confidence", 0.0)
        
        # 3. Update contract doc
        db.contracts.update_one(
            {"_id": ObjectId(contract_id)},
            {"$set": {
                "contract_type": contract_type,
                "title": extracted_data.get("title"),
                "client_contact": extracted_data.get("client_contact"),
                "summary": extracted_data.get("summary"),
                "project_value": project_value,
                "project_value_confidence": project_value_confidence
            }}
        )
        
        # 4. Extract and save milestones
        milestones = extracted_data.get("milestones", [])
        milestones, _ = resolve_amounts(milestones, project_value, project_value_confidence)
        
        contract = db.contracts.find_one({"_id": ObjectId(contract_id)})
        for ms in milestones:
            ms["contract_id"] = contract_id
            ms["freelancer_id"] = contract["freelancer_id"]
            ms["modified_from_contract"] = False
            
        if milestones:
            save_milestones(db, milestones)
            
        try:
            from lib.rag import index_contract
        except ImportError:
            from backend.lib.rag import index_contract
            
        index_contract(db, contract_id, contract["freelancer_id"], sections)
            
        review_required = any(is_review_required(ms.get("extraction_confidence", 1.0)) for ms in milestones)
        final_status = "review_required" if review_required else "extracted"
        
        db.contracts.update_one(
            {"_id": ObjectId(contract_id)},
            {"$set": {
                "extraction_status": final_status
            }}
        )
    except Exception as e:
        db.contracts.update_one(
            {"_id": ObjectId(contract_id)},
            {"$set": {
                "extraction_status": "failed",
                "extraction_error": str(e)
            }}
        )
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)

@router.post("/upload")
async def upload_contract(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    freelancer_id: str = Depends(get_current_user_id)
):
    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename provided")
        
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ['.pdf', '.docx']:
        raise HTTPException(status_code=400, detail="Only .pdf and .docx files are supported")
        
    fd, temp_path = tempfile.mkstemp(suffix=ext)
    try:
        with os.fdopen(fd, 'wb') as f:
            content = await file.read()
            f.write(content)
    except Exception as e:
        if os.path.exists(temp_path):
            os.remove(temp_path)
        raise HTTPException(status_code=500, detail=f"Failed to save uploaded file: {str(e)}")
        
    db = get_db()
    try:
        try:
            from lib.storage import save_pdf
        except ImportError:
            from backend.lib.storage import save_pdf
        file_url = save_pdf(db, temp_path, file.filename, metadata={"freelancer_id": freelancer_id}, bucket_name="contracts")
    except Exception as e:
        if os.path.exists(temp_path):
            os.remove(temp_path)
        raise HTTPException(status_code=500, detail=f"Failed to store file in GridFS: {str(e)}")
    new_contract = {
        "freelancer_id": freelancer_id,
        "extraction_status": "processing",
        "created_at": datetime.now(timezone.utc),
        "client_name": None,
        "client_address": None,
        "client_email": None,
        "project_name": None,
        "project_value": None,
        "currency": None,
        "contract_date": None,
        "contract_type": None,
        "payment_terms_days": None,
        "file_url": file_url,
        "indexed_for_rag": False
    }
    
    result = db.contracts.insert_one(new_contract)
    contract_id = str(result.inserted_id)
    
    background_tasks.add_task(
        process_ingestion,
        contract_id=contract_id,
        temp_path=temp_path,
        filename=file.filename
    )
    
    return {"contract_id": contract_id, "extraction_status": "processing"}

@router.get("/")
async def list_contracts(
    background_tasks: BackgroundTasks,
    freelancer_id: str = Depends(get_current_user_id)
):
    db = get_db()
    contracts = list(db.contracts.find({"freelancer_id": freelancer_id}))
    for c in contracts:
        c["_id"] = str(c["_id"])
        
    try:
        from lib.state_machine import run_pending_checks
    except ImportError:
        from backend.lib.state_machine import run_pending_checks
        
    background_tasks.add_task(run_pending_checks, db, freelancer_id)
    return contracts

@router.get("/{id}")
async def get_contract(id: str, freelancer_id: str = Depends(get_current_user_id)):
    db = get_db()
    contract = db.contracts.find_one({"_id": ObjectId(id), "freelancer_id": freelancer_id})
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
        
    contract["_id"] = str(contract["_id"])
    milestones = list(db.milestones.find({"contract_id": id, "freelancer_id": freelancer_id}))
    for m in milestones:
        m["_id"] = str(m["_id"])
        if m.get("status") in ("INVOICED", "OVERDUE", "PAID"):
            invoice = db.invoices.find_one({"milestone_id": m["_id"]})
            if invoice:
                m["invoice_id"] = str(invoice["_id"])
        
    return {"contract": contract, "milestones": milestones}

@router.delete("/{id}")
async def delete_contract(id: str, freelancer_id: str = Depends(get_current_user_id)):
    db = get_db()
    
    # Fetch contract BEFORE deleting so we can clean up GridFS
    contract = db.contracts.find_one({"_id": ObjectId(id), "freelancer_id": freelancer_id})
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    
    # Import delete_pdf helper dynamically to handle local vs root module path issues
    try:
        from lib.storage import delete_pdf
    except ImportError:
        from backend.lib.storage import delete_pdf

    # 1. Fetch all invoices associated with the contract to delete their PDFs & followup logs
    invoices = list(db.invoices.find({"contract_id": id, "freelancer_id": freelancer_id}))
    for invoice in invoices:
        pdf_file_id = invoice.get("pdf_file_id")
        if pdf_file_id:
            try:
                delete_pdf(db, pdf_file_id, bucket_name="invoices")
            except Exception:
                pass
        
        # Delete followup logs for this invoice
        db.followup_logs.delete_many({"invoice_id": str(invoice["_id"])})

    # 2. Delete all invoices from database
    db.invoices.delete_many({"contract_id": id, "freelancer_id": freelancer_id})
    
    # 3. Delete all milestones from database
    db.milestones.delete_many({"contract_id": id, "freelancer_id": freelancer_id})
    
    # 4. Delete all contract chunks (RAG index) from database
    db.contract_chunks.delete_many({"contract_id": id, "freelancer_id": freelancer_id})
    
    # 5. Delete raw contract PDF from GridFS
    if contract.get("file_url"):
        try:
            delete_pdf(db, contract["file_url"], bucket_name="contracts")
        except Exception:
            pass
            
    # 6. Delete the contract document itself
    db.contracts.delete_one({"_id": ObjectId(id), "freelancer_id": freelancer_id})
            
    return {"message": "Contract deleted successfully"}


from fastapi.responses import Response

@router.get("/{id}/pdf")
async def get_contract_pdf(id: str, freelancer_id: str = Depends(get_current_user_id)):
    db = get_db()
    contract = db.contracts.find_one({"_id": ObjectId(id), "freelancer_id": freelancer_id})
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
        
    file_id = contract.get("file_url")
    if not file_id:
        raise HTTPException(status_code=404, detail="Contract file not available")
        
    try:
        try:
            from lib.storage import retrieve_pdf
        except ImportError:
            from backend.lib.storage import retrieve_pdf
        pdf_bytes = retrieve_pdf(db, file_id, bucket_name="contracts")
        return Response(content=pdf_bytes, media_type="application/pdf")
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"File not found: {str(e)}")
