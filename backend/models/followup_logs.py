from datetime import datetime
from pydantic import BaseModel, Field

class FollowupLog(BaseModel):
    id: str | None = Field(default=None, alias="_id")
    invoice_id: str
    freelancer_id: str
    sent_at: datetime
    template_name: str
    recipient_email: str
    subject: str
    delivery_status: str
