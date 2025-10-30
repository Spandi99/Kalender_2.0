
from __future__ import annotations

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field

from .models import PreferredTimeOfDay, TaskIntervalUnit, TaskPriority


class TaskBase(BaseModel):
    title: str = Field(..., max_length=255)
    description: Optional[str] = Field(default=None, max_length=2000)
    priority: TaskPriority = TaskPriority.MEDIUM
    preferred_time: Optional[PreferredTimeOfDay] = None
    interval_value: int = Field(default=1, ge=1, le=30)
    interval_unit: TaskIntervalUnit = TaskIntervalUnit.WEEK
    duration_minutes: int = Field(default=60, ge=15, le=480)
    color: Optional[str] = None
    category: Optional[str] = None


class TaskCreate(TaskBase):
    pass


class TaskUpdate(BaseModel):
    title: Optional[str] = Field(default=None, max_length=255)
    description: Optional[str] = Field(default=None, max_length=2000)
    priority: Optional[TaskPriority] = None
    preferred_time: Optional[PreferredTimeOfDay] = None
    interval_value: Optional[int] = Field(default=None, ge=1, le=30)
    interval_unit: Optional[TaskIntervalUnit] = None
    duration_minutes: Optional[int] = Field(default=None, ge=15, le=480)
    color: Optional[str] = None
    category: Optional[str] = None
    completed: Optional[bool] = None


class TaskEventRead(BaseModel):
    event_id: int
    scheduled_for: datetime
    completed: bool

    class Config:
        orm_mode = True


class TaskRead(TaskBase):
    id: int
    completion_probability: float
    last_completed: Optional[datetime]
    next_due: Optional[datetime]
    last_scheduled_at: Optional[datetime]
    completed: bool
    created_at: datetime
    updated_at: datetime
    events: List[TaskEventRead] = Field(default_factory=list)

    class Config:
        orm_mode = True


class TaskStats(BaseModel):
    total_tasks: int
    overdue_tasks: int
    upcoming_tasks: int
    scheduled_events: int
    productive_hours: List[int]
    next_due: Optional[datetime]


class ScheduledTaskEvent(BaseModel):
    task_id: int
    event_id: int
    title: str
    start: datetime
    end: datetime


class ScheduleTasksResponse(BaseModel):
    scheduled: int
    skipped: int
    entries: List[ScheduledTaskEvent]


class OptimalTaskTimeResponse(BaseModel):
    category: Optional[str]
    optimal_time: Optional[str]
