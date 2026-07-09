from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from bson import ObjectId
from db import get_db

try:
    from lib.auth_dep import get_current_user_id
    from lib.rag import ask_contract
except ImportError:
    from backend.lib.auth_dep import get_current_user_id
    from backend.lib.rag import ask_contract

router = APIRouter()

class AskRequest(BaseModel):
    question: str

@router.post("/{id}/ask")
async def ask_contract_endpoint(
    id: str,
    request: AskRequest,
    freelancer_id: str = Depends(get_current_user_id)
):
    db = get_db()
    
    try:
        obj_id = ObjectId(id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid contract ID format")

    contract = db.contracts.find_one({
        "_id": obj_id,
        "freelancer_id": freelancer_id
    })
    
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
        
    if not contract.get("indexed_for_rag"):
        raise HTTPException(
            status_code=400, 
            detail="This contract is still being indexed \u2014 try again shortly"
        )
        
    try:
        result = ask_contract(db, id, freelancer_id, request.question)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
