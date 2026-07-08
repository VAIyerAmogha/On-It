from datetime import datetime
from pydantic import BaseModel, Field

class ContractChunk(BaseModel):
    id: str | None = Field(default=None, alias="_id")
    contract_id: str
    freelancer_id: str
    section_ref: str
    section_title: str
    chunk_text: str
    embedding: list[float]
    indexed_at: datetime
