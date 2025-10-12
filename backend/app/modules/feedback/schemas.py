from datetime import datetime
from typing import Optional

from pydantic import BaseModel, conint


class FeedbackCreate(BaseModel):
    event_id: int
    rating: conint(ge=1, le=5)
    mood: str
    notes: Optional[str] = None


class FeedbackRead(BaseModel):
    id: int
    event_id: int
    rating: int
    mood: str
    notes: Optional[str]
    created_at: datetime

    class Config:
        orm_mode = True


class FeedbackSummary(BaseModel):
    average_rating: float
    mood_counts: dict[str, int]
    total_feedback: int
