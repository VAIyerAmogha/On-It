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
    from lib.extractor import extract_milestones, save_milestones, is_review_required
except ImportError:
    from backend.lib.auth_dep import get_current_user_id
    from backend.lib.ingestion import ingest_file
    from backend.lib.classifier import classify_contract
    from backend.lib.extractor import extract_milestones, save_milestones, is_review_required

router = APIRouter()

def process_ingestion(contract_id: str, temp_path: str, filename: str):
    db = get_db()
    try:
        # 1. Ingest file
        full_text, sections = ingest_file(temp_path, filename)
        
        # 2. Classify contract
        classification = classify_contract(full_text)
        contract_type = classification.get("contract_type", "unsupported")
        
        # 3. Update contract doc
        db.contracts.update_one(
            {"_id": ObjectId(contract_id)},
            {"$set": {
                "contract_type": contract_type,
                "extraction_status": "ingested"
            }}
        )
        
        # 4. Extract and save milestones
        contract = db.contracts.find_one({"_id": ObjectId(contract_id)})
        milestones = extract_milestones(
            contract_id=contract_id,
            freelancer_id=contract["freelancer_id"],
            full_text=full_text,
            contract_type=contract_type,
            project_value=contract.get("project_value"),
            project_value_confidence=contract.get("project_value_confidence", 0.0),
            contract_date=contract.get("contract_date")
        )
        
        if milestones:
            save_milestones(db, milestones)
            
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
                "error_message": str(e)
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
        "file_url": None,
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
        
    return {"contract": contract, "milestones": milestones}
