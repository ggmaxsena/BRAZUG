from datetime import datetime
from enum import Enum
from pydantic import BaseModel, Field


class TaskStatus(str, Enum):
    pending = "pending"
    running = "running"
    success = "success"
    failed = "failed"


class DonationRequest(BaseModel):
    donor: str = Field(..., example="Maria")
    message: str = Field("", example="Faça uma base de funk")
    amount: float = Field(0.0, example=10.0)
    currency: str = Field("BRL", example="BRL")


class DonationTask(BaseModel):
    id: str
    donor: str
    message: str
    amount: float
    currency: str
    style: str | None = None
    model: str | None = None
    prompt: str | None = None
    voice: str | None = None
    structure: str | None = None
    dice_summary: str | None = None
    status: TaskStatus = TaskStatus.pending
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime | None = None
    result_url: str | None = None
    filename: str | None = None
    failure_reason: str | None = None
