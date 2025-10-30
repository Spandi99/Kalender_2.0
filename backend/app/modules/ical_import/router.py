from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from httpx import HTTPError
from sqlalchemy.orm import Session

from ...core.database import get_db
from . import schemas
from .models import ImportedCalendar
from .service import create_calendar, list_calendars, sync_calendar

router = APIRouter(tags=["iCal"])


@router.get("/", response_model=list[schemas.ImportedCalendarOut])
def read_calendars(db: Session = Depends(get_db)) -> list[schemas.ImportedCalendarOut]:
    calendars = list_calendars(db)
    return [schemas.ImportedCalendarOut.from_orm(calendar) for calendar in calendars]


@router.post("/import", response_model=schemas.ImportedCalendarOut, status_code=status.HTTP_201_CREATED)
def add_calendar(payload: schemas.ImportedCalendarCreate, db: Session = Depends(get_db)) -> schemas.ImportedCalendarOut:
    existing = db.query(ImportedCalendar).filter(ImportedCalendar.url == str(payload.url)).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Calendar already added")

    calendar = create_calendar(db, payload.name, str(payload.url), payload.color)
    return schemas.ImportedCalendarOut.from_orm(calendar)


@router.post("/sync/{calendar_id}")
def sync_calendar_endpoint(calendar_id: int, db: Session = Depends(get_db)) -> dict[str, object]:
    try:
        calendar = sync_calendar(db, calendar_id)
    except HTTPError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Failed to fetch iCal feed") from exc
    if not calendar:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Calendar not found")
    return {"status": "success", "last_synced": calendar.last_synced}
