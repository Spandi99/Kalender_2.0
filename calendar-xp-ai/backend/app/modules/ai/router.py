from __future__ import annotations

from typing import List

from fastapi import APIRouter
from pydantic import BaseModel

from ...core.utils import standard_response

router = APIRouter(prefix="/api/v1/ai", tags=["ai"])


class AITaskSuggestion(BaseModel):
    task: str
    confidence: float


@router.get("/suggestions", response_model=List[AITaskSuggestion])
async def get_suggestions() -> List[AITaskSuggestion]:
    """Return placeholder AI suggestions until the model is trained."""

    return [
        AITaskSuggestion(task="Focus block for deep work", confidence=0.82),
        AITaskSuggestion(task="Schedule weekly review", confidence=0.74),
    ]


@router.post("/train")
async def trigger_training() -> dict:
    """Pretend to trigger a background training job."""

    return standard_response(data={"status": "queued"}, message="accepted")
