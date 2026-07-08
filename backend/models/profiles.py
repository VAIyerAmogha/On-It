from datetime import datetime
from pydantic import BaseModel, Field

class Profile(BaseModel):
    id: str | None = Field(default=None, alias="_id")
    email: str
    password_hash: str
    name: str
    address: str
    gstin: str
    bank_name: str
    account_number: str
    ifsc: str
    upi_id: str
    gmail_address: str
    gmail_app_password: str
    default_gst_rate: float
    invoice_prefix: str
    invoice_counter: int
    created_at: datetime
