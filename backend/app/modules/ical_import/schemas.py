from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, HttpUrl


class ImportedCalendarBase(BaseModel):
    name: str
    url: HttpUrl
    color: Optional[str] = None


class ImportedCalendarCreate(ImportedCalendarBase):
    pass


class ImportedCalendarOut(BaseModel):
    id: int
    name: str
    url: HttpUrl
    last_synced: Optional[datetime]
    color: Optional[str]

    class Config:
        orm_mode = True
