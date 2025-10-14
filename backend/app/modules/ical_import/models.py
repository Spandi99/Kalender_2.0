"""Database models for the iCal import module."""
from __future__ import annotations

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from app.core.database import Base


class ExternalCalendar(Base):
    __tablename__ = "external_calendars"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    url = Column(String, nullable=False)
    last_synced = Column(DateTime, nullable=True)
    active = Column(Boolean, default=True, nullable=False)

    events = relationship(
        "ImportedEvent",
        back_populates="source_calendar",
        cascade="all, delete-orphan",
    )


class ImportedEvent(Base):
    __tablename__ = "imported_events"

    id = Column(Integer, primary_key=True, index=True)
    uid = Column(String, unique=True, index=True, nullable=False)
    title = Column(String, nullable=True)
    start = Column(DateTime, nullable=True)
    end = Column(DateTime, nullable=True)
    source_calendar_id = Column(Integer, ForeignKey("external_calendars.id"), index=True, nullable=False)
    readonly = Column(Boolean, default=False, nullable=False)

    source_calendar = relationship("ExternalCalendar", back_populates="events")
