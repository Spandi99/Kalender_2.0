from __future__ import annotations

from typing import List

from fastapi import APIRouter
from pydantic import BaseModel

from ...core.utils import standard_response

router = APIRouter(prefix="/api/v1/xp", tags=["xp"])


class XPMilestone(BaseModel):
    level: int
    required_xp: int
    reward: str


class XPProgress(BaseModel):
    current_xp: int
    current_level: int
    milestones: List[XPMilestone]


_MILESTONES: list[XPMilestone] = [
    XPMilestone(level=1, required_xp=0, reward="Welcome badge"),
    XPMilestone(level=2, required_xp=500, reward="Custom theme"),
    XPMilestone(level=3, required_xp=1500, reward="AI mentor tips"),
]


@router.get("/progress", response_model=XPProgress)
async def get_progress() -> XPProgress:
    """Return a snapshot of the XP progress for the signed-in user."""

    return XPProgress(current_xp=620, current_level=2, milestones=_MILESTONES)


@router.get("/milestones", response_model=List[XPMilestone])
async def list_milestones() -> List[XPMilestone]:
    """Return all configured milestones."""

    return _MILESTONES


@router.post("/reward")
async def claim_reward(level: int) -> dict:
    """Acknowledge reward claims to keep the frontend flow unblocked."""

    matched = next((item for item in _MILESTONES if item.level == level), None)
    if not matched:
        return standard_response(data={"claimed": False, "reason": "invalid level"}, message="not-found")
    return standard_response(data={"claimed": True, "reward": matched.reward})
