from datetime import datetime
from pydantic import BaseModel, Field

class Invoice(BaseModel):
    id: str | None = Field(default=None, alias="_id")
    milestone_id: str
    contract_id: str
    freelancer_id: str
    invoice_number: str
    invoice_date: datetime
    due_date: datetime
    amount_before_gst: float
    gst_rate: float
    gst_amount: float
    total_amount: float
    file_url: str
    sent_at: datetime | None = None
    paid_at: datetime | None = None
    payment_lag_days: int | None = None
    modified_fields: list[str]
    created_at: datetime
