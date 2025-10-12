from sqlalchemy.orm import Session

from ..xp.service import award_xp_for_event
from .models import Event
from .schemas import EventCreate, EventUpdate


def list_events(db: Session) -> list[Event]:
    return db.query(Event).order_by(Event.start).all()


def create_event(db: Session, payload: EventCreate) -> Event:
    event = Event(**payload.dict())
    db.add(event)
    db.commit()
    db.refresh(event)
    return event


def update_event(db: Session, event_id: int, payload: EventUpdate) -> Event:
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise ValueError("Event not found")

    for field, value in payload.dict(exclude_unset=True).items():
        setattr(event, field, value)

    db.add(event)
    db.commit()
    db.refresh(event)
    return event


def delete_event(db: Session, event_id: int) -> None:
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise ValueError("Event not found")

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
