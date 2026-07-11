import os
import secrets
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from passlib.context import CryptContext
from jose import jwt
from db import get_db
import config
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests

try:
    from lib import email_utils
except ImportError:
    from backend.lib import email_utils

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
    
    token = secrets.token_urlsafe(32)
    expires = datetime.now(timezone.utc) + timedelta(hours=24)
    
    new_profile = {
        "email": req.email,
        "password_hash": hashed_password,
        "name": req.name,
        "address": "",
        "gstin": "",
        "gmail_address": "",
        "gmail_app_password": "",
        "default_gst_rate": 0.18,
        "invoice_prefix": "INV-",
        "invoice_counter": 1,
        "created_at": datetime.now(timezone.utc),
        "email_verified": False,
        "verification_token": token,
        "verification_token_expires": expires
    }
    
    result = db.profiles.insert_one(new_profile)
    
    verify_url = f"{config.FRONTEND_URL}/verify-email?token={token}"
    body = f"Welcome to On-It! Please verify your email by clicking the link below:\n\n{verify_url}"
    try:
        email_utils.send_email(
            to=req.email,
            subject="Verify your On-It account",
            body=body
        )
    except Exception as e:
        pass
        
    return {"message": "Registration successful. Please check your email to verify your account."}

@router.post("/login")
async def login(req: LoginRequest):
    db = get_db()
    user = db.profiles.find_one({"email": req.email})
    
    if user and user.get("password_hash") is None:
        raise HTTPException(status_code=400, detail="This account uses Google Sign-In — use the Google button instead")
        
    if not user or not pwd_context.verify(req.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
        
    if not user.get("email_verified", False):
        raise HTTPException(status_code=403, detail={"error_code": "EMAIL_NOT_VERIFIED", "message": "Email not verified"})
        
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

class GoogleAuthRequest(BaseModel):
    credential: str

@router.post("/google")
async def google_auth(req: GoogleAuthRequest):
    try:
        id_info = id_token.verify_oauth2_token(
            req.credential, 
            google_requests.Request(), 
            config.GOOGLE_CLIENT_ID
        )
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid Google token")

    email = id_info.get("email")
    name = id_info.get("name", "")
    sub = id_info.get("sub")
    
    if not email:
        raise HTTPException(status_code=400, detail="Google token missing email")

    db = get_db()
    user = db.profiles.find_one({"email": email})
    
    if not user:
        new_profile = {
            "email": email,
            "password_hash": None,
            "auth_provider": "google",
            "google_sub": sub,
            "email_verified": True,
            "name": name,
            "address": "",
            "gstin": "",
            "gmail_address": "",
            "gmail_app_password": "",
            "default_gst_rate": 0.18,
            "invoice_prefix": "INV-",
            "invoice_counter": 1,
            "created_at": datetime.now(timezone.utc)
        }
        result = db.profiles.insert_one(new_profile)
        user_id = str(result.inserted_id)
    else:
        if user.get("auth_provider") == "email":
            db.profiles.update_one(
                {"_id": user["_id"]},
                {"$set": {"google_sub": sub}}
            )
        user_id = str(user["_id"])

    secret = os.getenv("JWT_SECRET")
    if not secret:
        raise HTTPException(status_code=500, detail="JWT_SECRET not configured")
        
    expire = datetime.now(timezone.utc) + timedelta(days=7)
    payload = {
        "sub": user_id,
        "exp": expire
    }
    
    token = jwt.encode(payload, secret, algorithm="HS256")
    return {"access_token": token, "token_type": "bearer"}

@router.get("/verify-email")
async def verify_email(token: str):
    db = get_db()
    user = db.profiles.find_one({"verification_token": token})
    
    if not user:
        raise HTTPException(status_code=400, detail="Invalid verification token")
        
    expires = user.get("verification_token_expires")
    if expires:
        if expires.tzinfo is None:
            expires = expires.replace(tzinfo=timezone.utc)
        if expires < datetime.now(timezone.utc):
            raise HTTPException(status_code=400, detail="Expired verification token")
            
    db.profiles.update_one(
        {"_id": user["_id"]},
        {"$set": {"email_verified": True}, "$unset": {"verification_token": "", "verification_token_expires": ""}}
    )
    
    return {"message": "Email verified successfully"}

class ResendVerificationRequest(BaseModel):
    email: str

@router.post("/resend-verification")
async def resend_verification(req: ResendVerificationRequest):
    db = get_db()
    user = db.profiles.find_one({"email": req.email})
    
    success_msg = {"message": "If an account exists and is not verified, a verification email has been sent."}
    
    if not user or user.get("email_verified"):
        return success_msg
        
    token = secrets.token_urlsafe(32)
    expires = datetime.now(timezone.utc) + timedelta(hours=24)
    
    db.profiles.update_one(
        {"_id": user["_id"]},
        {"$set": {"verification_token": token, "verification_token_expires": expires}}
    )
    
    verify_url = f"{config.FRONTEND_URL}/verify-email?token={token}"
    body = f"Welcome to On-It! Please verify your email by clicking the link below:\n\n{verify_url}"
    try:
        email_utils.send_email(
            to=req.email,
            subject="Verify your On-It account",
            body=body
        )
    except Exception as e:
        pass
        
    return success_msg
