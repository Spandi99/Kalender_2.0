from datetime import datetime
from typing import Optional

from pydantic import BaseModel, validator


class EventBase(BaseModel):
    title: str
    start: datetime
    end: datetime
    category: str = "work"
    description: Optional[str] = None

    @validator("start", "end", pre=True)
    def normalize_datetime(cls, value: datetime | str) -> datetime:
        if isinstance(value, str):
            try:
                return datetime.fromisoformat(value.replace(" ", "T"))
            except Exception as exc:  # pragma: no cover - delegated to validation
                raise ValueError(f"Invalid datetime format: {value}") from exc
        return value


class EventCreate(EventBase):
    pass


class EventUpdate(BaseModel):
    title: Optional[str] = None
    start: Optional[datetime] = None
    end: Optional[datetime] = None
    category: Optional[str] = None
    description: Optional[str] = None
    completed: Optional[bool] = None


class EventRead(EventBase):
    id: int
    completed: bool

    class Config:
        orm_mode = True


class EventCompleteResponse(BaseModel):
    event: EventRead
    xp_awarded: int


class EventCategoryRead(BaseModel):
    slug: str
    name: str
    xp_value: int

    class Config:
        orm_mode = True
