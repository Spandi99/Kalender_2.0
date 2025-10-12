from sqlalchemy.orm import Session

from ..feedback.models import Feedback
from ..xp.models import XPEntry
from ..xp.service import award_xp_for_event, get_xp_value_for_category
from .models import Event, EventCategory
from .schemas import EventCreate, EventUpdate


def list_events(db: Session) -> list[Event]:
    return db.query(Event).order_by(Event.start).all()


def list_categories(db: Session) -> list[EventCategory]:
    return db.query(EventCategory).order_by(EventCategory.name).all()


def _ensure_category_exists(db: Session, category_slug: str) -> EventCategory:
    category = db.query(EventCategory).filter(EventCategory.slug == category_slug).first()
    if not category:
        raise ValueError(f"Category '{category_slug}' not found")
    return category


def create_event(db: Session, payload: EventCreate) -> Event:
    _ensure_category_exists(db, payload.category)
    event = Event(**payload.dict())
    db.add(event)
    db.commit()
    db.refresh(event)
    return event


def update_event(db: Session, event_id: int, payload: EventUpdate) -> Event:
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise ValueError("Event not found")

    update_values = payload.dict(exclude_unset=True)
    if "category" in update_values:
        _ensure_category_exists(db, update_values["category"])

    for field, value in update_values.items():
        setattr(event, field, value)

    if event.xp_entry and "category" in update_values:
        event.xp_entry.category = event.category
        event.xp_entry.xp_value = get_xp_value_for_category(db, event.category)
        db.add(event.xp_entry)

    db.add(event)
    db.commit()
    db.refresh(event)
    return event


def delete_event(db: Session, event_id: int) -> None:
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise ValueError("Event not found")

    db.query(XPEntry).filter(XPEntry.event_id == event.id).delete(synchronize_session=False)
    db.query(Feedback).filter(Feedback.event_id == event.id).delete(synchronize_session=False)

    db.delete(event)
    db.commit()


def complete_event(db: Session, event_id: int) -> tuple[Event, int]:
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise ValueError("Event not found")

    if not event.completed:
        event.completed = True
        db.add(event)
        db.commit()
        db.refresh(event)

    xp = award_xp_for_event(db, event)
    return event, xp
