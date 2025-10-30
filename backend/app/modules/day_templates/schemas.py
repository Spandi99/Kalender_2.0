
from datetime import date, time
from typing import List, Optional

from pydantic import BaseModel, Field


class TemplateBlockCreate(BaseModel):
    label: str
    start_time: time
    end_time: time
    category: Optional[str] = None
    color: Optional[str] = None


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


class TemplateApplyOptions(BaseModel):
    start_date: date
    days_of_week: List[int] = Field(default_factory=list, description="0=Monday, 6=Sunday")
    duration_weeks: int = Field(default=1, ge=1, le=26)
    include_start_date: bool = True
