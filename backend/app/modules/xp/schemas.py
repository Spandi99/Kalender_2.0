from datetime import datetime
from typing import Dict

from pydantic import BaseModel


class XPEntryRead(BaseModel):
    category: str
    xp_value: int
    created_at: datetime

    class Config:
        orm_mode = True


class XPTotals(BaseModel):
    total: int
    by_category: Dict[str, int]
