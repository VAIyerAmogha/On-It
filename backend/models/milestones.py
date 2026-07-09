from datetime import datetime
from pydantic import BaseModel, Field

class MilestoneRecord(BaseModel):
    id: str | None = Field(default=None, alias="_id")
    contract_id: str
    freelancer_id: str
    milestone_number: int
    trigger_type: str
    trigger_condition: str | None = None
    trigger_date: datetime | None = None
    percentage: float | None = None
    amount_inr: float | None = None
    deliverable_description: str | None = None
    status: str
    extraction_confidence: float
    modified_from_contract: bool
    created_at: datetime
    updated_at: datetime
