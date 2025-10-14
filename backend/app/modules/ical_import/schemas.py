"""Pydantic schemas for the iCal import module."""
from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, HttpUrl


class ExternalCalendarCreate(BaseModel):
    name: str
    url: HttpUrl


class ExternalCalendarOut(BaseModel):
    id: int
    name: str
    url: HttpUrl
    last_synced: Optional[datetime]

    class Config:
        orm_mode = True
