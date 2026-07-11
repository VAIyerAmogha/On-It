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

import datetime
from datetime import timezone

try:
    from lib import email_utils
except ImportError:
    from backend.lib import email_utils

try:
    from lib.invoice_gen import build_cover_note
except ImportError:
    from backend.lib.invoice_gen import build_cover_note

try:
    import config
except ImportError:
    from backend import config

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

@router.get("/{id}/email-preview")
async def get_email_preview(id: str, freelancer_id: str = Depends(get_current_user_id)):
    db = get_db()
    
    try:
        query_id = ObjectId(id)
    except Exception:
        query_id = id
        
    invoice = db.invoices.find_one({"_id": query_id, "freelancer_id": freelancer_id})
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
        
    try:
        preview = build_cover_note(db, id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
        
    preview["from"] = config.GMAIL_ADDRESS
    return preview

class EmailSendRequest(BaseModel):
    subject: str
    body: str

@router.post("/{id}/send")
async def send_invoice_email_manual(id: str, request: EmailSendRequest, freelancer_id: str = Depends(get_current_user_id)):
    db = get_db()
    
    try:
        query_id = ObjectId(id)
    except Exception:
        query_id = id
        
    invoice = db.invoices.find_one({"_id": query_id, "freelancer_id": freelancer_id})
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
        
    contract_id = invoice.get("contract_id")
    try:
        c_query_id = ObjectId(contract_id)
    except Exception:
        c_query_id = contract_id
    contract = db.contracts.find_one({"_id": c_query_id})
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
        
    client_email = contract.get("client_email") or (contract.get("client_contact") or {}).get("email")
    if not client_email:
        raise HTTPException(status_code=400, detail="Client email not found")
        
    pdf_file_id = invoice.get("pdf_file_id")
    if not pdf_file_id:
        raise HTTPException(status_code=404, detail="Invoice PDF not generated")
        
    try:
        pdf_bytes = retrieve_pdf(db, pdf_file_id)
    except StorageError as e:
        raise HTTPException(status_code=404, detail=str(e))
        
    now = datetime.datetime.now(timezone.utc)
    
    try:
        email_utils.send_email(
            to=client_email,
            subject=request.subject,
            body=request.body,
            attachments=[{
                "filename": f"{invoice.get('invoice_number', 'invoice')}.pdf",
                "content": pdf_bytes
            }]
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to send email: {str(e)}")
        
    if not invoice.get("sent_at"):
        db.invoices.update_one({"_id": query_id}, {"$set": {"sent_at": now}})
        invoice["sent_at"] = now
        
    db.followup_logs.insert_one({
        "invoice_id": str(query_id),
        "freelancer_id": freelancer_id,
        "sent_at": now,
        "template_name": "manual_send",
        "recipient_email": client_email,
        "subject": request.subject,
        "delivery_status": "sent"
    })
    
    invoice["_id"] = str(invoice["_id"])
    return invoice
