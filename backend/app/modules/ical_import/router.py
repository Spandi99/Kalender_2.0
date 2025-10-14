"""API routes for iCal calendar import and synchronisation."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db

from . import schemas, service

router = APIRouter(prefix="/ical", tags=["iCal Import"])


@router.post("/import", response_model=schemas.ExternalCalendarOut, status_code=status.HTTP_201_CREATED)
def import_ical(cal: schemas.ExternalCalendarCreate, db: Session = Depends(get_db)):
    return service.import_calendar(db, cal.name, str(cal.url))


@router.post("/sync/{calendar_id}")
def sync_ical(calendar_id: int, db: Session = Depends(get_db)):
    try:
        return service.sync_calendar(db, calendar_id)
    except service.ExternalCalendarNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.get("/", response_model=list[schemas.ExternalCalendarOut])
def list_calendars(db: Session = Depends(get_db)):
    return service.list_calendars(db)
