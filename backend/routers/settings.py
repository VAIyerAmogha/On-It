from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from bson import ObjectId
from db import get_db
from lib.auth_dep import get_current_user_id

router = APIRouter()

class SettingsUpdate(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    gstin: Optional[str] = None
    default_gst_rate: Optional[float] = None
    invoice_prefix: Optional[str] = None

@router.get("/")
def get_settings(user_id: str = Depends(get_current_user_id)):
    db = get_db()
    try:
        oid = ObjectId(user_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid user ID")
        
    profile = db.profiles.find_one({"_id": oid})
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
        
    profile["_id"] = str(profile["_id"])
    if "password_hash" in profile:
        del profile["password_hash"]
        
    return profile

@router.put("/")
def update_settings(settings: SettingsUpdate, user_id: str = Depends(get_current_user_id)):
    db = get_db()
    try:
        oid = ObjectId(user_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid user ID")
        
    update_data = settings.model_dump(exclude_unset=True)
    if not update_data:
        return {"message": "No fields to update"}
        
    result = db.profiles.update_one(
        {"_id": oid},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Profile not found")
        
    return {"message": "Settings updated successfully"}
