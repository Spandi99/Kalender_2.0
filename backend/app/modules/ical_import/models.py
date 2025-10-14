"""Database models for the iCal import module."""
from __future__ import annotations

from sqlalchemy import Boolean, Column, DateTime, Integer, String
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
        "Event",
        back_populates="external_calendar",
        cascade="all, delete-orphan",
    )
