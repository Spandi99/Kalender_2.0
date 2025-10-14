"""Service layer for importing and syncing external calendars."""
from __future__ import annotations

from datetime import datetime
from typing import Dict, List

from sqlalchemy.orm import Session

from .models import ExternalCalendar, ImportedEvent
from .parser import fetch_and_parse_ical


class ExternalCalendarNotFoundError(LookupError):
    """Raised when an external calendar cannot be found."""


def import_calendar(db: Session, name: str, url: str) -> ExternalCalendar:
    """Register a new external calendar for future synchronisation."""
    calendar = ExternalCalendar(name=name, url=url, last_synced=None)
    db.add(calendar)
    db.commit()
    db.refresh(calendar)
    return calendar


def _upsert_imported_event(db: Session, calendar: ExternalCalendar, event_data: Dict[str, object]) -> None:
    existing = db.query(ImportedEvent).filter_by(uid=str(event_data["uid"])).first()

    if existing:
        existing.title = event_data.get("title")
        existing.start = event_data.get("start")
        existing.end = event_data.get("end")
        existing.source_calendar_id = calendar.id
        existing.readonly = False
        return

    imported_event = ImportedEvent(
        uid=str(event_data["uid"]),
        title=event_data.get("title"),
        start=event_data.get("start"),
        end=event_data.get("end"),
        source_calendar_id=calendar.id,
        readonly=False,
    )
    db.add(imported_event)


def sync_calendar(db: Session, calendar_id: int) -> Dict[str, int]:
    """Synchronise events from an external calendar feed."""
    calendar = db.get(ExternalCalendar, calendar_id)
    if calendar is None:
        raise ExternalCalendarNotFoundError(f"External calendar {calendar_id} not found")

    events = fetch_and_parse_ical(calendar.url)

    for event_data in events:
        _upsert_imported_event(db, calendar, event_data)

    calendar.last_synced = datetime.utcnow()
    db.commit()

    return {"imported": len(events)}


def list_calendars(db: Session) -> List[ExternalCalendar]:
    """Return all registered external calendars."""
    return db.query(ExternalCalendar).order_by(ExternalCalendar.name).all()
