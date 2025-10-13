from typing import Dict, Optional

from pydantic import BaseModel


class XPSummary(BaseModel):
    total: int
    by_category: Dict[str, int]


class LevelStatus(BaseModel):
    current_level: int
    xp_current: int
    xp_previous: int
    xp_next: Optional[int]
    progress: float
    avatar_state: str
    expression: str
