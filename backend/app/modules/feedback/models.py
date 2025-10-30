from enum import Enum as PyEnum

from sqlalchemy import Boolean, Column, DateTime, Enum, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from ...core.database import Base
from ...core.time import utc_now


class FeedbackReason(PyEnum):
    TOO_TIRED = "too_tired"
    NO_TIME = "no_time"
    FORGOT = "forgot"
    LOW_MOTIVATION = "low_motivation"
    OTHER = "other"


class Punctuality(PyEnum):
    ON_TIME = "on_time"
    LATE = "late"
    EARLY = "early"


class Feedback(Base):
    __tablename__ = "feedback"

    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(Integer, ForeignKey("events.id"), nullable=False)
    completed = Column(Boolean, default=True, nullable=False)
    rating = Column(Integer, nullable=True)
    mood = Column(String(50), nullable=True)
    reason = Column(Enum(FeedbackReason, name="feedback_reason_enum", native_enum=False), nullable=True)
    punctuality = Column(Enum(Punctuality, name="punctuality_enum", native_enum=False), nullable=True)
    arrival_delay_minutes = Column(Integer, nullable=True)
    duration_variance_minutes = Column(Integer, nullable=True)
    notes = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    event = relationship("Event", back_populates="feedbacks")
