from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class EventBase(BaseModel):
    title: str
    start: datetime
    end: datetime
    category: str = "General"
    description: Optional[str] = None


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
