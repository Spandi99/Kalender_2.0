from collections import Counter

from sqlalchemy.orm import Session

from ..calendar.models import Event
from ..xp.models import XPLog
from ..xp.service import award_xp_for_event
from .models import Feedback, Punctuality
from .schemas import FeedbackCreate


def create_feedback(db: Session, payload: FeedbackCreate) -> Feedback:
    event = db.query(Event).filter(Event.id == payload.event_id).first()
    if not event:
        raise ValueError("Event not found")

    payload_data = payload.dict()
    feedback = Feedback(**payload_data)

    event.completed = payload.completed
    db.add(event)
    db.add(feedback)

    if payload.completed:
        award_xp_for_event(db, event, feedback_override=feedback)
    else:
        db.query(XPLog).filter(XPLog.event_id == event.id).delete(synchronize_session=False)
        db.commit()

    db.refresh(feedback)
    return feedback


def get_feedback_summary(db: Session) -> dict[str, object]:
    feedback_items = db.query(Feedback).all()
    if not feedback_items:
        return {
            "average_rating": 0.0,
            "mood_counts": {},
            "total_feedback": 0,
            "completion_rate": 0.0,
            "punctuality_distribution": {status.value: 0 for status in Punctuality},
        }

    ratings = [item.rating for item in feedback_items if item.rating is not None]
    mood_counts = Counter(item.mood for item in feedback_items if item.mood)
    punctuality_counts = Counter(item.punctuality for item in feedback_items if item.punctuality)
    total_feedback = len(feedback_items)
    completed_count = sum(1 for item in feedback_items if item.completed)

    punctuality_distribution = {
        status.value: punctuality_counts.get(status, 0) for status in Punctuality
    }

    return {
        "average_rating": sum(ratings) / len(ratings) if ratings else 0.0,
        "mood_counts": dict(mood_counts),
        "total_feedback": total_feedback,
        "completion_rate": completed_count / total_feedback if total_feedback else 0.0,
        "punctuality_distribution": punctuality_distribution,
    }
