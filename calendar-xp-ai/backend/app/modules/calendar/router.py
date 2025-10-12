from __future__ import annotations

from datetime import datetime, timedelta
from typing import List

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field

from ...core.utils import standard_response

router = APIRouter(prefix="/api/v1/calendar", tags=["calendar"])


class CalendarEvent(BaseModel):
    id: int
    title: str
    start: datetime
    end: datetime
    all_day: bool = Field(default=False, alias="allDay")

    class Config:
        allow_population_by_field_name = True
        json_encoders = {datetime: lambda v: v.isoformat()}


_EVENT_STORE: list[CalendarEvent] = [
    CalendarEvent(
        id=1,
        title="Team Sync",
        start=datetime.utcnow(),
        end=datetime.utcnow() + timedelta(hours=1),
        all_day=False,
    ),
    CalendarEvent(
        id=2,
        title="Deep Work",
        start=datetime.utcnow() + timedelta(hours=2),
        end=datetime.utcnow() + timedelta(hours=4),
        all_day=False,
    ),
]


@router.get("/events", response_model=List[CalendarEvent])
async def list_events() -> List[CalendarEvent]:
    """Return all scheduled events."""

    return _EVENT_STORE


class CreateEventRequest(BaseModel):
    title: str
    start: datetime
    end: datetime
    all_day: bool = Field(default=False, alias="allDay")

    class Config:
        allow_population_by_field_name = True


@router.post(
    "/events",
    status_code=status.HTTP_201_CREATED,
    response_model=CalendarEvent,
)
async def create_event(payload: CreateEventRequest) -> CalendarEvent:
    """Create a new event and store it in memory."""

    if payload.end <= payload.start:
        raise HTTPException(status_code=400, detail="Event end must be after start time")

    new_id = max((event.id for event in _EVENT_STORE), default=0) + 1
    event = CalendarEvent(id=new_id, **payload.dict(by_alias=True))
    _EVENT_STORE.append(event)
    return event


@router.delete("/events/{event_id}")
async def delete_event(event_id: int) -> dict:
    """Remove an event from the store."""

    global _EVENT_STORE
    before = len(_EVENT_STORE)
    _EVENT_STORE = [event for event in _EVENT_STORE if event.id != event_id]
    if len(_EVENT_STORE) == before:
        raise HTTPException(status_code=404, detail="Event not found")
    return standard_response(data={"deleted": event_id})
