from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from ...core.database import Base


class EventCategory(Base):
    __tablename__ = "event_categories"

    slug = Column(String(100), primary_key=True)
    name = Column(String(255), nullable=False)
    xp_value = Column(Integer, nullable=False, default=20)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    events = relationship("Event", back_populates="category_ref")


class Event(Base):
    __tablename__ = "events"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    start = Column(DateTime, nullable=False)
    end = Column(DateTime, nullable=False)
    category = Column(String(100), ForeignKey("event_categories.slug"), nullable=False, default="work")
    description = Column(Text, nullable=True)
    completed = Column(Boolean, default=False, nullable=False)
    actual_start = Column(DateTime, nullable=True)
    actual_end = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    category_ref = relationship("EventCategory", back_populates="events")
    xp_log_entry = relationship("XPLog", back_populates="event", uselist=False)
    feedbacks = relationship("Feedback", back_populates="event")
