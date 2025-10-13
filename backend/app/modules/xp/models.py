from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from ...core.database import Base


class XPLog(Base):
    __tablename__ = "xp_log"

    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(Integer, ForeignKey("events.id"), nullable=False, unique=True)
    category = Column(String(50), nullable=False)
    xp_awarded = Column(Integer, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    event = relationship("Event", back_populates="xp_log_entry")


class AvatarState(Base):
    __tablename__ = "avatar_state"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=True, index=True, default=1)
    level = Column(Integer, nullable=False, default=1)
    mood = Column(String(32), nullable=False, default="neutral")
    last_update = Column(DateTime, default=datetime.utcnow, nullable=False)
