from __future__ import annotations

from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import backref, relationship

from ...core.database import Base


class ImportedCalendar(Base):
    __tablename__ = "imported_calendars"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    url = Column(String, nullable=False, unique=True)
    last_synced = Column(DateTime, nullable=True)

    events = relationship(
        "ImportedEvent",
        back_populates="calendar",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )


class ImportedEvent(Base):
    __tablename__ = "imported_events"
    __table_args__ = (
        UniqueConstraint("uid", "calendar_id", name="uq_imported_events_uid_calendar"),
    )

    id = Column(Integer, primary_key=True, index=True)
    uid = Column(String, nullable=False)
    title = Column(String, nullable=False)
    start = Column(DateTime, nullable=False)
    end = Column(DateTime, nullable=False)
    description = Column(Text, nullable=True)
    last_updated = Column(DateTime, nullable=True, default=datetime.utcnow)

    calendar_id = Column(Integer, ForeignKey("imported_calendars.id", ondelete="CASCADE"), nullable=False)
    calendar = relationship("ImportedCalendar", back_populates="events")

    event_id = Column(Integer, ForeignKey("events.id", ondelete="CASCADE"), unique=True)
    event = relationship("Event", backref=backref("imported_source", uselist=False), uselist=False)
