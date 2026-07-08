from datetime import datetime
from pydantic import BaseModel, Field

class Contract(BaseModel):
    id: str | None = Field(default=None, alias="_id")
    freelancer_id: str
    client_name: str
    client_address: str
    client_email: str
    project_name: str
    project_value: float
    currency: str
    contract_date: datetime
    contract_type: str
    payment_terms_days: int
    file_url: str
    extraction_status: str
    indexed_for_rag: bool
    created_at: datetime
