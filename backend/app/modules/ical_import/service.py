from __future__ import annotations

import logging
from datetime import date, datetime, time, timedelta, timezone
from typing import Iterable
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

import httpx
from sqlalchemy.orm import Session

from ...core.time import LOCAL_TIMEZONE, to_utc, utc_now
from ..calendar.models import Event, EventCategory
from ..feedback.models import Feedback
from ..xp.models import XPLog
from .models import ImportedCalendar, ImportedEvent

logger = logging.getLogger(__name__)

DEFAULT_CATEGORY = "other"
SYNC_TIMEOUT_SECONDS = 15


def list_calendars(db: Session) -> Iterable[ImportedCalendar]:
    return db.query(ImportedCalendar).order_by(ImportedCalendar.name.asc()).all()


def create_calendar(db: Session, name: str, url: str, color: str | None = None) -> ImportedCalendar:
    calendar = ImportedCalendar(name=name, url=url, color=color)
    db.add(calendar)
    db.commit()
    db.refresh(calendar)
    return calendar


def delete_calendar(db: Session, calendar_id: int) -> None:
    calendar = db.get(ImportedCalendar, calendar_id)
    if not calendar:
        return
    db.delete(calendar)
    db.commit()


def _normalize_datetime(value) -> datetime:
    if value is None:
        raise ValueError("Event missing datetime value")

    if isinstance(value, datetime):
        dt = value
    elif isinstance(value, date):
        dt = datetime.combine(value, time.min, tzinfo=LOCAL_TIMEZONE)
    else:
        raise ValueError("Unsupported datetime type")

    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=LOCAL_TIMEZONE)

    return to_utc(dt)


def _parse_duration(value: str) -> timedelta:
    if not value or not value.startswith("P"):
        raise ValueError("Invalid duration format")

    weeks = days = hours = minutes = seconds = 0
    number = ""
    in_time = False

    for char in value[1:]:
        if char == "T":
            in_time = True
            continue
        if char.isdigit():
            number += char
            continue
        if not number:
            continue
        if char == "W":
            weeks += int(number)
        elif char == "D":
            days += int(number)
        elif char == "H":
            hours += int(number)
        elif char == "M":
            if in_time:
                minutes += int(number)
            else:
                raise ValueError("Month duration not supported")
        elif char == "S":
            seconds += int(number)
        number = ""

    total_days = weeks * 7 + days
    return timedelta(days=total_days, hours=hours, minutes=minutes, seconds=seconds)


def _parse_datetime_string(value: str, params: list[str]) -> datetime | date:
    tzinfo: ZoneInfo | timezone | None = None
    date_only = False

    for param in params:
        if param.upper() == "VALUE=DATE":
            date_only = True
        elif param.upper().startswith("TZID="):
            tz_name = param.split("=", 1)[1]
            try:
                tzinfo = ZoneInfo(tz_name)
            except ZoneInfoNotFoundError:
                logger.warning("Unknown timezone '%s' in iCal feed", tz_name)
                tzinfo = None

    if date_only or len(value) == 8:
        return datetime.strptime(value[:8], "%Y%m%d").date()

    formats = ("%Y%m%dT%H%M%S", "%Y%m%dT%H%M")
    for fmt in formats:
        try:
            dt = datetime.strptime(value.rstrip("Z"), fmt)
            break
        except ValueError:
            dt = None
    if dt is None:
        raise ValueError(f"Unsupported datetime value: {value}")

    if value.endswith("Z"):
        return dt.replace(tzinfo=timezone.utc)
    if tzinfo is not None:
        return dt.replace(tzinfo=tzinfo)
    return dt


def _unfold_ical_lines(content: str) -> list[str]:
    unfolded: list[str] = []
    buffer = ""
    for raw_line in content.splitlines():
        if raw_line.startswith(" ") or raw_line.startswith("\t"):
            buffer += raw_line[1:]
            continue
        if buffer:
            unfolded.append(buffer)
        buffer = raw_line
    if buffer:
        unfolded.append(buffer)
    return unfolded


def _extract_event_blocks(content: str) -> list[dict[str, tuple[str, list[str]]]]:
    events: list[dict[str, tuple[str, list[str]]]] = []
    current: dict[str, tuple[str, list[str]]] | None = None
    for line in _unfold_ical_lines(content):
        if line == "BEGIN:VEVENT":
            current = {}
            continue
        if line == "END:VEVENT":
            if current is not None:
                events.append(current)
            current = None
            continue
        if current is None or ":" not in line:
            continue
        key_part, value = line.split(":", 1)
        key_segments = key_part.split(";")
        key = key_segments[0]
        params = key_segments[1:]
        current[key] = (value, params)
    return events


def _unescape_ical_text(value: str) -> str:
    return (
        value.replace("\\\\", "\\")
        .replace("\\n", "\n")
        .replace("\\N", "\n")
        .replace("\\,", ",")
        .replace("\\;", ";")
    )


def _ensure_category(db: Session, candidate: str | None) -> str:
    if not candidate:
        return DEFAULT_CATEGORY

    slug = candidate.strip().lower().replace(" ", "_")
    category = db.query(EventCategory).filter(EventCategory.slug == slug).first()
    if category:
        return category.slug
    return DEFAULT_CATEGORY


def _build_event_payload(
    db: Session, event_fields: dict[str, tuple[str, list[str]]]
) -> tuple[str, datetime, datetime, str, str]:
    uid_field = event_fields.get("UID")
    if not uid_field:
        raise ValueError("iCal event is missing UID")
    uid = uid_field[0].strip()

    summary_field = event_fields.get("SUMMARY", ("Untitled Event", []))
    title = _unescape_ical_text(summary_field[0]).strip() or "Untitled Event"

    description_field = event_fields.get("DESCRIPTION", ("", []))
    description = _unescape_ical_text(description_field[0]).strip()

    start_field = event_fields.get("DTSTART")
    if not start_field:
        raise ValueError("iCal event is missing DTSTART")
    start_raw = _parse_datetime_string(start_field[0], start_field[1])
    start = _normalize_datetime(start_raw)

    if "DTEND" in event_fields:
        end_value, end_params = event_fields["DTEND"]
        end_raw = _parse_datetime_string(end_value, end_params)
        end = _normalize_datetime(end_raw)
    elif "DURATION" in event_fields:
        duration_value, _ = event_fields["DURATION"]
        end = start + _parse_duration(duration_value)
    else:
        end = start

    categories_field = event_fields.get("CATEGORIES")
    category_value: str | None = None
    if categories_field:
        raw_categories = _unescape_ical_text(categories_field[0])
        category_candidates = [item.strip() for item in raw_categories.split(",") if item.strip()]
        if category_candidates:
            category_value = category_candidates[0]

    category_slug = _ensure_category(db, category_value)

    return uid, start, end, title, description, category_slug


def _update_linked_event(
    event: Event,
    *,
    title: str,
    start: datetime,
    end: datetime,
    description: str,
    category: str,
    color: str | None,
) -> None:
    event.title = title
    event.start = start
    event.end = end
    event.description = description or None
    event.category = category
    event.color = color


def _remove_linked_event(db: Session, event_id: int) -> None:
    event = db.get(Event, event_id)
    if not event:
        return
    db.query(XPLog).filter(XPLog.event_id == event.id).delete(synchronize_session=False)
    db.query(Feedback).filter(Feedback.event_id == event.id).delete(synchronize_session=False)
    db.delete(event)


def sync_calendar(db: Session, calendar_id: int) -> ImportedCalendar | None:
    calendar = db.get(ImportedCalendar, calendar_id)
    if not calendar:
        return None

    with httpx.Client(timeout=SYNC_TIMEOUT_SECONDS) as client:
        response = client.get(calendar.url)
        response.raise_for_status()
        payload = response.text

    seen_uids: set[str] = set()

    for event_fields in _extract_event_blocks(payload):
        try:
            uid, start, end, title, description, category = _build_event_payload(db, event_fields)
        except Exception as exc:  # pragma: no cover - defensive logging
            logger.warning("Skipping malformed VEVENT during sync: %s", exc)
            continue

        seen_uids.add(uid)

        imported_event = (
            db.query(ImportedEvent)
            .filter(ImportedEvent.uid == uid, ImportedEvent.calendar_id == calendar.id)
            .first()
        )

        if imported_event is None:
            imported_event = ImportedEvent(
                uid=uid,
                title=title,
                start=start,
                end=end,
                description=description,
                calendar=calendar,
            )
            db.add(imported_event)
            db.flush()

        imported_event.title = title
        imported_event.start = start
        imported_event.end = end
        imported_event.description = description or None
        imported_event.last_updated = utc_now()

        if imported_event.event is None:
            linked_event = Event(
                title=title,
                start=start,
                end=end,
                description=description or None,
                category=category,
                completed=False,
                color=calendar.color,
            )
            db.add(linked_event)
            db.flush()
            imported_event.event = linked_event
        else:
            linked_event = imported_event.event

        _update_linked_event(
            linked_event,
            title=title,
            start=start,
            end=end,
            description=description,
            category=category,
            color=calendar.color,
        )

    for orphan in list(calendar.events):
        if orphan.uid in seen_uids:
            continue
        if orphan.event_id is not None:
            _remove_linked_event(db, orphan.event_id)
        db.delete(orphan)

    calendar.last_synced = utc_now()
    db.commit()
    db.refresh(calendar)
    return calendar
