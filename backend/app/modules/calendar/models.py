from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from ...core.database import Base
from ...core.time import utc_now


class EventCategory(Base):
    __tablename__ = "event_categories"

    slug = Column(String(100), primary_key=True)
    name = Column(String(255), nullable=False)
    xp_value = Column(Integer, nullable=False, default=20)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    events = relationship("Event", back_populates="category_ref")


class Event(Base):
    __tablename__ = "events"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    start = Column(DateTime(timezone=True), nullable=False)
    end = Column(DateTime(timezone=True), nullable=False)
    category = Column(String(100), ForeignKey("event_categories.slug"), nullable=False, default="work")
    description = Column(Text, nullable=True)
    completed = Column(Boolean, default=False, nullable=False)
    color = Column(String(20), nullable=True)
    actual_start = Column(DateTime(timezone=True), nullable=True)
    actual_end = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    category_ref = relationship("EventCategory", back_populates="events")
    xp_log_entry = relationship("XPLog", back_populates="event", uselist=False)
    feedbacks = relationship("Feedback", back_populates="event")
    task_link = relationship("TaskEvent", back_populates="event", uselist=False)
