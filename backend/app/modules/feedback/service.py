from collections import Counter

from sqlalchemy.orm import Session

from ..calendar.models import Event
from .models import Feedback
from .schemas import FeedbackCreate


def create_feedback(db: Session, payload: FeedbackCreate) -> Feedback:
    event = db.query(Event).filter(Event.id == payload.event_id).first()
    if not event:
        raise ValueError("Event not found")

    feedback = Feedback(**payload.dict())
    db.add(feedback)
    db.commit()
    db.refresh(feedback)
    return feedback


def get_feedback_summary(db: Session) -> dict[str, object]:
    feedback_items = db.query(Feedback).all()
    if not feedback_items:
        return {"average_rating": 0.0, "mood_counts": {}, "total_feedback": 0}

    total_rating = sum(item.rating for item in feedback_items)
    mood_counts = Counter(item.mood for item in feedback_items)
    return {
        "average_rating": total_rating / len(feedback_items),
        "mood_counts": dict(mood_counts),
        "total_feedback": len(feedback_items),
    }
