import os
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError

security = HTTPBearer()

def get_current_user_id(credentials: HTTPAuthorizationCredentials = Depends(security)) -> str:
    """
    Dependency to validate JWT token and extract the user ID (freelancer_id).
    """
    token = credentials.credentials
    secret = os.getenv("JWT_SECRET")
    
    if not secret:
        raise HTTPException(status_code=500, detail="JWT_SECRET is not configured.")
        
    try:
        payload = jwt.decode(token, secret, algorithms=["HS256"])
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid authentication credentials")
        return str(user_id)
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")
