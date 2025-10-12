from __future__ import annotations

from typing import List

from fastapi import APIRouter, status
from pydantic import BaseModel, Field

from ...core.utils import standard_response

router = APIRouter(prefix="/api/v1/feedback", tags=["feedback"])


class FeedbackItem(BaseModel):
    id: int
    message: str
    rating: int = Field(ge=1, le=5)


class CreateFeedbackRequest(BaseModel):
    message: str
    rating: int = Field(ge=1, le=5)


_FEEDBACK_STORE: list[FeedbackItem] = []


@router.get("/", response_model=List[FeedbackItem])
async def list_feedback() -> List[FeedbackItem]:
    """Return feedback messages collected so far."""

    return _FEEDBACK_STORE


@router.post("/", status_code=status.HTTP_201_CREATED)
async def submit_feedback(payload: CreateFeedbackRequest) -> dict:
    """Store feedback locally until the analytics module is ready."""

    feedback = FeedbackItem(id=len(_FEEDBACK_STORE) + 1, **payload.dict())
    _FEEDBACK_STORE.append(feedback)
    return standard_response(data=feedback.dict())
