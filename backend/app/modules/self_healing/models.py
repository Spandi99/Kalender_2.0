"""Database models for the self-healing subsystem."""
from __future__ import annotations

from sqlalchemy import Boolean, Column, DateTime, Integer, String, Text, func

from app.core.database import Base


class SystemLog(Base):
    """Persistence model for automated recovery actions."""

    __tablename__ = "system_logs"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
    component = Column(String(50))
    severity = Column(String(20))
    message = Column(Text)
    action_taken = Column(Text)
    resolved = Column(Boolean, default=False)
