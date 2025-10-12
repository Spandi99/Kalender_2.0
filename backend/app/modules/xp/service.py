from collections import defaultdict

from sqlalchemy.orm import Session

from ..calendar.models import Event, EventCategory
from .models import XPEntry

DEFAULT_XP = 20


def _determine_xp_value(db: Session, category_slug: str) -> int:
    category = db.query(EventCategory).filter(EventCategory.slug == category_slug).first()
    if category:
        return category.xp_value
    return DEFAULT_XP


def get_xp_value_for_category(db: Session, category_slug: str) -> int:
    return _determine_xp_value(db, category_slug)


def award_xp_for_event(db: Session, event: Event) -> int:
    existing = db.query(XPEntry).filter(XPEntry.event_id == event.id).first()
    if existing:
        return existing.xp_value

    xp_value = _determine_xp_value(db, event.category)
    entry = XPEntry(event_id=event.id, category=event.category, xp_value=xp_value)
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry.xp_value


def get_xp_totals(db: Session) -> dict[str, int]:
    totals = defaultdict(int)
    for entry in db.query(XPEntry).all():
        totals[entry.category] += entry.xp_value
    return dict(totals)
