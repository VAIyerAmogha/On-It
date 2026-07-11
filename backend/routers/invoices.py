import io
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from bson import ObjectId
from db import get_db

try:
    from lib.auth_dep import get_current_user_id
except ImportError:
    from backend.lib.auth_dep import get_current_user_id

try:
    from lib.storage import retrieve_pdf, StorageError
except ImportError:
    from backend.lib.storage import retrieve_pdf, StorageError

router = APIRouter()

@router.get("/by-milestone/{milestone_id}")
async def get_invoice_by_milestone(milestone_id: str, freelancer_id: str = Depends(get_current_user_id)):
    db = get_db()
    invoice = db.invoices.find_one({"milestone_id": milestone_id})
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found for this milestone")
    invoice["_id"] = str(invoice["_id"])
    return invoice

@router.get("/{id}")
async def get_invoice(id: str, freelancer_id: str = Depends(get_current_user_id)):
    db = get_db()
    
    try:
        query_id = ObjectId(id)
    except Exception:
        query_id = id
        
    invoice = db.invoices.find_one({"_id": query_id, "freelancer_id": freelancer_id})
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
        
    invoice["_id"] = str(invoice["_id"])
    return invoice

@router.get("/{id}/pdf")
async def get_invoice_pdf(id: str, freelancer_id: str = Depends(get_current_user_id)):
    db = get_db()
    
    try:
        query_id = ObjectId(id)
    except Exception:
        query_id = id
        
    invoice = db.invoices.find_one({"_id": query_id, "freelancer_id": freelancer_id})
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
        
    pdf_file_id = invoice.get("pdf_file_id")
    if not pdf_file_id:
        raise HTTPException(status_code=404, detail="Invoice PDF not generated")
        
    try:
        pdf_bytes = retrieve_pdf(db, pdf_file_id)
    except StorageError as e:
        raise HTTPException(status_code=404, detail=str(e))
        
    return StreamingResponse(
        io.BytesIO(pdf_bytes), 
        media_type="application/pdf",
        headers={"Content-Disposition": f'inline; filename="{invoice.get("invoice_number", "invoice")}.pdf"'}
    )

class FollowupActionRequest(BaseModel):
    action: str

@router.patch("/{id}/followup")
async def toggle_followup(id: str, request: FollowupActionRequest, freelancer_id: str = Depends(get_current_user_id)):
    db = get_db()
    
    try:
        query_id = ObjectId(id)
    except Exception:
        query_id = id
        
    invoice = db.invoices.find_one({"_id": query_id, "freelancer_id": freelancer_id})
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
        
    if request.action not in ("pause", "resume"):
        raise HTTPException(status_code=400, detail="Action must be 'pause' or 'resume'")
        
    is_paused = (request.action == "pause")
    db.invoices.update_one({"_id": query_id}, {"$set": {"followup_paused": is_paused}})
    
    invoice["followup_paused"] = is_paused
    invoice["_id"] = str(invoice["_id"])
    return invoice
