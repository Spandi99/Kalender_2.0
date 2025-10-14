"""Service layer for importing and syncing external calendars."""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Dict, List, Optional

from sqlalchemy.orm import Session

from ..calendar.models import Event
from .models import ExternalCalendar
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


def _normalise_datetime(value: Optional[datetime]) -> Optional[datetime]:
    if value is None:
        return None

    if value.tzinfo is None:
        return value

    return value.astimezone(timezone.utc).replace(tzinfo=None)


def _upsert_imported_event(db: Session, calendar: ExternalCalendar, event_data: Dict[str, object]) -> None:
    uid = str(event_data["uid"])
    start = _normalise_datetime(event_data.get("start"))
    if start is None:
        return

    end = _normalise_datetime(event_data.get("end")) or start
    title = (event_data.get("title") or "").strip() or "(Kein Titel)"

    existing = db.query(Event).filter_by(external_uid=uid).first()

    if existing:
        existing.title = title
        existing.start = start
        existing.end = end
        existing.external_calendar_id = calendar.id
        return

    event = Event(
        title=title,
        start=start,
        end=end,
        category="work",
        description=None,
        completed=False,
        external_uid=uid,
        external_calendar_id=calendar.id,
    )
    db.add(event)


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
