from fastapi import APIRouter, Depends, HTTPException
from bson import ObjectId
from db import get_db

try:
    from lib.auth_dep import get_current_user_id
except ImportError:
    from backend.lib.auth_dep import get_current_user_id
    
router = APIRouter()

@router.get("/{contract_id}")
async def get_milestones(contract_id: str, freelancer_id: str = Depends(get_current_user_id)):
    db = get_db()
    
    contract = db.contracts.find_one({"_id": ObjectId(contract_id), "freelancer_id": freelancer_id})
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
        
    milestones = list(db.milestones.find({"contract_id": contract_id, "freelancer_id": freelancer_id}))
    for m in milestones:
        m["_id"] = str(m["_id"])
        
    return milestones
