from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Request
from bson import ObjectId
import os
import db
from db import get_db
from pydantic import BaseModel
from typing import Optional

from helpers.auth_dep import get_current_user_id
from helpers.state_machine import run_pending_checks
    
router = APIRouter()

@router.get("/detail/{id}")
async def get_milestone_detail(id: str, freelancer_id: str = Depends(get_current_user_id)):
    db = get_db()
    try:
        query_id = ObjectId(id)
    except Exception:
        query_id = id
        
    milestone = db.milestones.find_one({"_id": query_id, "freelancer_id": freelancer_id})
    if not milestone:
        raise HTTPException(status_code=404, detail="Milestone not found")
        
    contract = db.contracts.find_one({"_id": ObjectId(milestone.get("contract_id", "")), "freelancer_id": freelancer_id})
    invoice = db.invoices.find_one({"milestone_id": id, "freelancer_id": freelancer_id})
    
    milestone["_id"] = str(milestone["_id"])
    if contract:
        contract["_id"] = str(contract["_id"])
    if invoice:
        invoice["_id"] = str(invoice["_id"])
        
    return {"milestone": milestone, "contract": contract, "invoice": invoice}

@router.get("/all/list")
async def list_all_milestones(
    freelancer_id: str = Depends(get_current_user_id)
):
    db = get_db()
    milestones = list(db.milestones.find({"freelancer_id": freelancer_id}))
    for m in milestones:
        m["_id"] = str(m["_id"])
        m["contract_id"] = str(m["contract_id"])
        
        contract = db.contracts.find_one({"_id": ObjectId(m["contract_id"])})
        if contract:
            m["contract_title"] = contract.get("title") or contract.get("project_name") or "Untitled Project"
            m["client_name"] = contract.get("client_name") or (contract.get("client_contact") or {}).get("name") or "Unknown Client"
            
        if m.get("status") in ("INVOICED", "OVERDUE", "PAID"):
            invoice = db.invoices.find_one({"milestone_id": m["_id"]})
            if invoice:
                m["invoice_id"] = str(invoice["_id"])
    return milestones

@router.get("/{contract_id}")
async def get_milestones(
    contract_id: str, 
    background_tasks: BackgroundTasks,
    freelancer_id: str = Depends(get_current_user_id)
):
    db = get_db()
    
    contract = db.contracts.find_one({"_id": ObjectId(contract_id), "freelancer_id": freelancer_id})
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
        
    milestones = list(db.milestones.find({"contract_id": contract_id, "freelancer_id": freelancer_id}))
    for m in milestones:
        m["_id"] = str(m["_id"])
        if m.get("status") in ("INVOICED", "OVERDUE", "PAID"):
            invoice = db.invoices.find_one({"milestone_id": m["_id"]})
            if invoice:
                m["invoice_id"] = str(invoice["_id"])

        
    return milestones

@router.patch("/{id}/trigger")
async def trigger_milestone(id: str, freelancer_id: str = Depends(get_current_user_id)):
    db = get_db()
    
    try:
        query_id = ObjectId(id)
    except Exception:
        query_id = id
        
    milestone = db.milestones.find_one({"_id": query_id, "freelancer_id": freelancer_id})
    if not milestone:
        raise HTTPException(status_code=404, detail="Milestone not found")
        
    if milestone.get("status") != "PENDING":
        raise HTTPException(status_code=409, detail=f"Milestone is currently '{milestone.get('status')}', not PENDING")
        
    from helpers.state_machine import transition_milestone
    updated = transition_milestone(db, id, "TRIGGERED", actor="user")
    updated["_id"] = str(updated["_id"])
    return updated

@router.patch("/{id}/paid")
async def paid_milestone(id: str, freelancer_id: str = Depends(get_current_user_id)):
    db = get_db()
    
    try:
        query_id = ObjectId(id)
    except Exception:
        query_id = id
        
    milestone = db.milestones.find_one({"_id": query_id, "freelancer_id": freelancer_id})
    if not milestone:
        raise HTTPException(status_code=404, detail="Milestone not found")
        
    if milestone.get("status") not in ("INVOICED", "OVERDUE"):
        raise HTTPException(status_code=409, detail=f"Milestone is currently '{milestone.get('status')}', not INVOICED or OVERDUE")
        
    from helpers.state_machine import mark_paid
    result = mark_paid(db, id)
    result["milestone"]["_id"] = str(result["milestone"]["_id"])
    return result

@router.post("/check-now")
async def check_now(freelancer_id: str = Depends(get_current_user_id)):
    db = get_db()
    from helpers.state_machine import run_pending_checks
        
    stats = run_pending_checks(db, freelancer_id)
    return stats

class InvoiceCreateRequest(BaseModel):
    edited_amount: Optional[float] = None

@router.post("/{id}/invoice")
async def create_milestone_invoice(
    id: str,
    request: Optional[InvoiceCreateRequest] = None,
    freelancer_id: str = Depends(get_current_user_id)
):
    db = get_db()
    try:
        query_id = ObjectId(id)
    except Exception:
        query_id = id
        
    milestone = db.milestones.find_one({"_id": query_id, "freelancer_id": freelancer_id})
    if not milestone:
        raise HTTPException(status_code=404, detail="Milestone not found")
        
    if milestone.get("status") != "TRIGGERED":
        raise HTTPException(status_code=409, detail=f"Milestone is currently '{milestone.get('status')}', not TRIGGERED")
        
    from helpers.invoice_gen import create_invoice
        
    edited_amount = request.edited_amount if request else None
    invoice = create_invoice(db, id, edited_amount=edited_amount)
    invoice["_id"] = str(invoice["_id"])
    return invoice

class MissedDeadlineInvoiceRequest(BaseModel):
    discount_percentage: float

@router.post("/{id}/invoice-missed-deadline")
async def create_missed_deadline_invoice(
    id: str,
    request: MissedDeadlineInvoiceRequest,
    freelancer_id: str = Depends(get_current_user_id)
):
    if request.discount_percentage <= 0 or request.discount_percentage > 100:
        raise HTTPException(status_code=422, detail="Discount percentage must be greater than 0 and less than or equal to 100")
        
    db = get_db()
    try:
        query_id = ObjectId(id)
    except Exception:
        query_id = id
        
    milestone = db.milestones.find_one({"_id": query_id, "freelancer_id": freelancer_id})
    if not milestone:
        raise HTTPException(status_code=404, detail="Milestone not found")
        
    if milestone.get("status") != "TRIGGERED":
        raise HTTPException(status_code=409, detail=f"Milestone is currently '{milestone.get('status')}', not TRIGGERED")
        
    from helpers.invoice_gen import create_invoice
        
    invoice = create_invoice(db, id, delivery_missed=True, discount_percentage=request.discount_percentage)
    invoice["_id"] = str(invoice["_id"])
    return invoice

@router.post("/milestones/check-now-cron")
async def cron_check_all(request: Request):
    auth_header = request.headers.get("Authorization", "")
    expected = f"Bearer {os.environ.get('CRON_SECRET', '')}"
    if auth_header != expected:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    db = get_db()
    profiles = list(db.profiles.find({}, {"_id": 1}))
    count = 0
    for profile in profiles:
        try:
            run_pending_checks(db, str(profile["_id"]))
            count += 1
        except Exception:
            pass
    
    return {"checked": count, "freelancers": len(profiles)}

