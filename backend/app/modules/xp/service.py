from collections import defaultdict

from sqlalchemy.orm import Session

from ..calendar.models import Event
from .models import XPEntry

CATEGORY_XP = {
    "work": 50,
    "personal": 30,
    "health": 40,
}
DEFAULT_XP = 20


def award_xp_for_event(db: Session, event: Event) -> int:
    existing = db.query(XPEntry).filter(XPEntry.event_id == event.id).first()
    if existing:
        return existing.xp_value

    xp_value = CATEGORY_XP.get(event.category, DEFAULT_XP)
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
