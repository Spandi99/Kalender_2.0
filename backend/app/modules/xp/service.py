from __future__ import annotations

from collections import defaultdict

from sqlalchemy.orm import Session

from ..calendar.models import Event
from .models import XPLog

XP_RATE_PER_HOUR: dict[str, int] = {
    "work": 20,
    "exercise": 30,
    "study": 25,
    "other": 10,
}
DEFAULT_XP_RATE = 10


def _resolve_category(category: str | None) -> str:
    if not category:
        return "Other"
    normalized = category.strip()
    if not normalized:
        return "Other"
    return normalized.title()


def _determine_rate(category: str | None) -> int:
    if not category:
        return DEFAULT_XP_RATE
    return XP_RATE_PER_HOUR.get(category.lower(), DEFAULT_XP_RATE)


def _calculate_duration_hours(event: Event) -> float:
    delta = event.end - event.start
    return max(delta.total_seconds() / 3600, 0.0)


def calculate_xp_award(event: Event) -> int:
    rate = _determine_rate(event.category)
    hours = _calculate_duration_hours(event)
    if hours <= 0:
        return 0

    raw_xp = rate * hours
    xp_awarded = int(round(raw_xp))
    if xp_awarded <= 0:
        xp_awarded = 1
    return xp_awarded


def award_xp_for_event(db: Session, event: Event) -> int:
    existing = db.query(XPLog).filter(XPLog.event_id == event.id).first()
    if existing:
        return existing.xp_awarded

    xp_awarded = calculate_xp_award(event)
    entry = XPLog(
        event_id=event.id,
        category=_resolve_category(event.category),
        xp_awarded=xp_awarded,
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry.xp_awarded


def get_xp_summary(db: Session) -> dict[str, dict[str, int] | int]:
    totals = defaultdict(int)
    overall = 0
    for entry in db.query(XPLog).all():
        totals[entry.category] += entry.xp_awarded
        overall += entry.xp_awarded
    return {"total": overall, "by_category": dict(totals)}
