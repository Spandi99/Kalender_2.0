from typing import Dict

from pydantic import BaseModel


class XPSummary(BaseModel):
    total: int
    by_category: Dict[str, int]
