from datetime import datetime
from typing import Optional

from pydantic import BaseModel, conint, root_validator

from .models import FeedbackReason, Punctuality


class FeedbackCreate(BaseModel):
    event_id: int
    completed: bool = True
    rating: Optional[conint(ge=1, le=5)] = None
    mood: Optional[str] = None
    reason: Optional[FeedbackReason] = None
    punctuality: Optional[Punctuality] = None
    arrival_delay_minutes: Optional[int] = None
    duration_variance_minutes: Optional[int] = None
    notes: Optional[str] = None

    @root_validator
    def validate_completion_and_punctuality(cls, values: dict) -> dict:
        completed = values.get("completed", True)
        rating = values.get("rating")
        mood = values.get("mood")
        punctuality = values.get("punctuality")
        arrival_delay = values.get("arrival_delay_minutes")

        if completed:
            if rating is None:
                raise ValueError("Rating is required when an event is completed.")
            if mood is None:
                raise ValueError("Mood is required when an event is completed.")
        else:
            if rating is not None:
                raise ValueError("Rating must be omitted when an event is not completed.")
            if mood is not None:
                raise ValueError("Mood must be omitted when an event is not completed.")
            values["punctuality"] = None
            values["arrival_delay_minutes"] = None
            values["duration_variance_minutes"] = None

        if punctuality == Punctuality.LATE and arrival_delay is None:
            raise ValueError("Arrival delay minutes are required when punctuality is late.")
        if punctuality != Punctuality.LATE:
            values["arrival_delay_minutes"] = None

        return values


class FeedbackRead(BaseModel):
    id: int
    event_id: int
    completed: bool
    rating: Optional[int]
    mood: Optional[str]
    reason: Optional[FeedbackReason]
    punctuality: Optional[Punctuality]
    arrival_delay_minutes: Optional[int]
    duration_variance_minutes: Optional[int]
    notes: Optional[str]
    created_at: datetime

    class Config:
        orm_mode = True


class FeedbackSummary(BaseModel):
    average_rating: float
    mood_counts: dict[str, int]
    total_feedback: int
    completion_rate: float
    punctuality_distribution: dict[str, int]
