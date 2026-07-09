from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from bson import ObjectId
from db import get_db
from pydantic import BaseModel
from typing import Optional

try:
    from lib.auth_dep import get_current_user_id
except ImportError:
    from backend.lib.auth_dep import get_current_user_id
    
router = APIRouter()

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
        
    try:
        from lib.state_machine import run_pending_checks
    except ImportError:
        from backend.lib.state_machine import run_pending_checks
        
    background_tasks.add_task(run_pending_checks, db, freelancer_id)
        
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
        
    if milestone.get("trigger_type") == "recurring":
        raise HTTPException(status_code=400, detail="Retainer milestones are system-managed and cannot be manually triggered")
        
    if milestone.get("status") != "PENDING":
        raise HTTPException(status_code=409, detail=f"Milestone is currently '{milestone.get('status')}', not PENDING")
        
    from lib.state_machine import transition_milestone
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
        
    from lib.state_machine import mark_paid
    result = mark_paid(db, id)
    result["milestone"]["_id"] = str(result["milestone"]["_id"])
    return result

@router.post("/check-now")
async def check_now(freelancer_id: str = Depends(get_current_user_id)):
    db = get_db()
    try:
        from lib.state_machine import run_pending_checks
    except ImportError:
        from backend.lib.state_machine import run_pending_checks
        
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
        
    try:
        from lib.invoice_gen import create_invoice
    except ImportError:
        from backend.lib.invoice_gen import create_invoice
        
    edited_amount = request.edited_amount if request else None
    invoice = create_invoice(db, id, edited_amount=edited_amount)
    invoice["_id"] = str(invoice["_id"])
    return invoice
