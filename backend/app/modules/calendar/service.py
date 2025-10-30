from sqlalchemy.orm import Session

from ...core.time import utc_now
from ..feedback.models import Feedback
from ..tasks.service import (
    reset_task_schedule,
    synchronize_task_schedule,
    update_task_feedback,
)
from ..xp.models import XPLog
from ..xp.service import award_xp_for_event
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

    imported_event = getattr(event, "imported_source", None)
    if imported_event is not None:
        imported_event.title = event.title
        imported_event.start = event.start
        imported_event.end = event.end
        imported_event.description = event.description
        imported_event.last_updated = utc_now()

    if "completed" in update_values:
        update_task_feedback(db, event, bool(event.completed))

    if event.task_link is not None:
        event.task_link.scheduled_for = event.start
        synchronize_task_schedule(db, event.task_link)
        db.add(event.task_link)

    db.add(event)
    db.commit()
    db.refresh(event)
    return event


def delete_event(db: Session, event_id: int) -> None:
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise ValueError("Event not found")

    task_link = event.task_link
    task_id = task_link.task_id if task_link is not None else None

    db.query(XPLog).filter(XPLog.event_id == event.id).delete(synchronize_session=False)
    db.query(Feedback).filter(Feedback.event_id == event.id).delete(synchronize_session=False)
    if task_link is not None:
        db.delete(task_link)
        db.flush()
        reset_task_schedule(db, task_id)

    imported_event = getattr(event, "imported_source", None)
    if imported_event is not None:
        db.delete(imported_event)

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

    update_task_feedback(db, event, True)

    xp = award_xp_for_event(db, event)
    return event, xp
