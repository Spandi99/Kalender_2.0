from datetime import time
from typing import List, Optional

from pydantic import BaseModel


class TemplateBlockCreate(BaseModel):
    label: str
    start_time: time
    end_time: time
    category: Optional[str] = None


class TemplateBlockOut(TemplateBlockCreate):
    id: int

    class Config:
        orm_mode = True


class DayTemplateCreate(BaseModel):
    name: str
    description: Optional[str] = None
    blocks: List[TemplateBlockCreate]


class DayTemplateOut(DayTemplateCreate):
    id: int
    blocks: List[TemplateBlockOut]

    class Config:
        orm_mode = True
