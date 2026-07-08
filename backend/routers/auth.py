import os
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from passlib.context import CryptContext
from jose import jwt
from db import get_db

router = APIRouter()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

class RegisterRequest(BaseModel):
    email: str
    password: str
    name: str

class LoginRequest(BaseModel):
    email: str
    password: str

@router.post("/register")
async def register(req: RegisterRequest):
    db = get_db()
    existing_user = db.profiles.find_one({"email": req.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
        
    hashed_password = pwd_context.hash(req.password)
    
    new_profile = {
        "email": req.email,
        "password_hash": hashed_password,
        "name": req.name,
        "address": "",
        "gstin": "",
        "bank_name": "",
        "account_number": "",
        "ifsc": "",
        "upi_id": "",
        "gmail_address": "",
        "gmail_app_password": "",
        "default_gst_rate": 0.18,
        "invoice_prefix": "INV-",
        "invoice_counter": 1,
        "created_at": datetime.now(timezone.utc)
    }
    
    result = db.profiles.insert_one(new_profile)
    return {"id": str(result.inserted_id), "email": req.email, "name": req.name}

@router.post("/login")
async def login(req: LoginRequest):
    db = get_db()
    user = db.profiles.find_one({"email": req.email})
    if not user or not pwd_context.verify(req.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
        
    secret = os.getenv("JWT_SECRET")
    if not secret:
        raise HTTPException(status_code=500, detail="JWT_SECRET not configured")
        
    expire = datetime.now(timezone.utc) + timedelta(days=7)
    payload = {
        "sub": str(user["_id"]),
        "exp": expire
    }
    
    token = jwt.encode(payload, secret, algorithm="HS256")
    return {"access_token": token, "token_type": "bearer"}
