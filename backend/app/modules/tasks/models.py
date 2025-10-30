
from __future__ import annotations

from datetime import datetime
from enum import Enum

from sqlalchemy import Boolean, Column, DateTime, Enum as SQLEnum, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from ...core.database import Base


class TaskPriority(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class PreferredTimeOfDay(str, Enum):
    MORNING = "morning"
    AFTERNOON = "afternoon"
    EVENING = "evening"


class TaskIntervalUnit(str, Enum):
    DAY = "day"
    WEEK = "week"
    MONTH = "month"


class Task(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    priority = Column(SQLEnum(TaskPriority, name="task_priority_enum", native_enum=False), nullable=False, default=TaskPriority.MEDIUM)
    preferred_time = Column(SQLEnum(PreferredTimeOfDay, name="task_preferred_time_enum", native_enum=False), nullable=True)
    interval_value = Column(Integer, nullable=False, default=1)
    interval_unit = Column(SQLEnum(TaskIntervalUnit, name="task_interval_unit_enum", native_enum=False), nullable=False, default=TaskIntervalUnit.WEEK)
    duration_minutes = Column(Integer, nullable=False, default=60)
    color = Column(String(20), nullable=True)
    category = Column(String(100), ForeignKey("event_categories.slug"), nullable=True)
    completion_probability = Column(Float, nullable=False, default=0.5)
    last_completed = Column(DateTime, nullable=True)
    next_due = Column(DateTime, nullable=True)
    last_scheduled_at = Column(DateTime, nullable=True)
    completed = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    events = relationship("TaskEvent", back_populates="task", cascade="all, delete-orphan")


class TaskEvent(Base):
    __tablename__ = "task_events"

    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(Integer, ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False)
    event_id = Column(Integer, ForeignKey("events.id", ondelete="CASCADE"), nullable=False, unique=True)
    scheduled_for = Column(DateTime, nullable=False)
    completed = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    task = relationship("Task", back_populates="events")
    event = relationship("Event", back_populates="task_link")
