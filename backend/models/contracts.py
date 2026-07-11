from datetime import datetime
from pydantic import BaseModel, Field

class Contract(BaseModel):
    id: str | None = Field(default=None, alias="_id")
    freelancer_id: str
    client_name: str | None = None
    client_address: str | None = None
    client_email: str | None = None
    project_name: str | None = None
    project_value: float | None = None
    currency: str | None = None
    contract_date: datetime | None = None
    contract_type: str | None = None
    payment_terms_days: int | None = None
    file_url: str | None = None
    extraction_status: str | None = None
    indexed_for_rag: bool | None = None
    created_at: datetime | None = None
    title: str | None = None
    client_contact: dict | None = None
    summary: str | None = None
