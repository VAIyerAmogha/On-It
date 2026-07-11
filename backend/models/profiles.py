from datetime import datetime
from pydantic import BaseModel, Field

class Profile(BaseModel):
    id: str | None = Field(default=None, alias="_id")
    email: str
    password_hash: str | None = None
    auth_provider: str = "email"
    google_sub: str | None = None
    email_verified: bool = False
    verification_token: str | None = None
    verification_token_expires: datetime | None = None
    name: str
    address: str
    gstin: str
    gmail_address: str
    gmail_app_password: str
    default_gst_rate: float
    invoice_prefix: str
    invoice_counter: int
    created_at: datetime
