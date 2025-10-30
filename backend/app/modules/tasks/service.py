
from __future__ import annotations

from collections import Counter
from datetime import datetime, time, timedelta
from typing import Iterable, Optional

from sqlalchemy import func
from sqlalchemy.orm import Session, selectinload

from ...core.time import LOCAL_TIMEZONE, to_local, to_utc, utc_now
from ..calendar.models import Event
from ..calendar.schemas import EventCreate
from ..feedback.models import Feedback
from .models import PreferredTimeOfDay, Task, TaskEvent, TaskIntervalUnit, TaskPriority
from .schemas import (
    OptimalTaskTimeResponse,
    ScheduleTasksResponse,
    ScheduledTaskEvent,
    TaskCreate,
    TaskStats,
    TaskUpdate,
)

DEFAULT_CATEGORY = "work"
MORNING_HOUR = 9
AFTERNOON_HOUR = 14
EVENING_HOUR = 19
_SLOT_INCREMENT_MINUTES = 30
_MAX_SLOT_ATTEMPTS = 16

PREFERRED_TIME_HOURS = {
    PreferredTimeOfDay.MORNING: MORNING_HOUR,
    PreferredTimeOfDay.AFTERNOON: AFTERNOON_HOUR,
    PreferredTimeOfDay.EVENING: EVENING_HOUR,
}


def list_tasks(db: Session) -> list[Task]:
    return (
        db.query(Task)
        .options(selectinload(Task.events).selectinload(TaskEvent.event))
        .order_by(Task.next_due.is_(None), Task.next_due.asc())
        .all()
    )


def _compute_next_due(task: Task, anchor: datetime) -> datetime:
    if task.interval_unit == TaskIntervalUnit.DAY:
        delta = timedelta(days=task.interval_value)
    elif task.interval_unit == TaskIntervalUnit.WEEK:
        delta = timedelta(weeks=task.interval_value)
    else:
        delta = timedelta(days=30 * task.interval_value)
    return anchor + delta


def _resolve_optimal_hour(db: Session, task: Task) -> int:
    base_query = (
        db.query(Event.start)
        .join(Feedback, Feedback.event_id == Event.id)
        .filter(Feedback.completed.is_(True))
    )

    if task.category:
        category_query = base_query.filter(Event.category == task.category).all()
    else:
        category_query = []

    hours: list[int] = [to_local(row[0]).hour for row in category_query]
    if not hours:
        global_rows = base_query.all()
        hours = [to_local(row[0]).hour for row in global_rows]

    if hours:
        counter = Counter(hours)
        return counter.most_common(1)[0][0]

    if task.preferred_time:
        return PREFERRED_TIME_HOURS.get(task.preferred_time, MORNING_HOUR)

    return MORNING_HOUR


def _round_start_time(candidate: datetime) -> datetime:
    minute = (candidate.minute // 15) * 15
    rounded = candidate.replace(minute=0, second=0, microsecond=0) + timedelta(minutes=minute)
    if rounded < candidate:
        rounded += timedelta(minutes=15)
    return rounded


def _find_free_slot(db: Session, start: datetime, duration: timedelta) -> Optional[datetime]:
    candidate = _round_start_time(start)
    for _ in range(_MAX_SLOT_ATTEMPTS):
        end = candidate + duration
        conflict = (
            db.query(Event)
            .filter(Event.start < end, Event.end > candidate)
            .first()
        )
        if conflict is None:
            return candidate
        candidate += timedelta(minutes=_SLOT_INCREMENT_MINUTES)
    return None


def _refresh_completion_probability(db: Session, task: Task) -> None:
    total = db.query(func.count(TaskEvent.id)).filter(TaskEvent.task_id == task.id).scalar() or 0
    if total == 0:
        task.completion_probability = 0.5
        return
    completed = (
        db.query(func.count(TaskEvent.id))
        .filter(TaskEvent.task_id == task.id, TaskEvent.completed.is_(True))
        .scalar()
        or 0
    )
    task.completion_probability = completed / total if total else 0.5


def create_task(db: Session, payload: TaskCreate) -> Task:
    now = utc_now()
    task = Task(
        title=payload.title,
        description=payload.description,
        priority=payload.priority,
        preferred_time=payload.preferred_time,
        interval_value=payload.interval_value,
        interval_unit=payload.interval_unit,
        duration_minutes=payload.duration_minutes,
        color=payload.color,
        category=payload.category,
        next_due=now,
        completion_probability=0.5,
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    return task


def update_task(db: Session, task_id: int, payload: TaskUpdate) -> Task:
    task = (
        db.query(Task)
        .options(selectinload(Task.events).selectinload(TaskEvent.event))
        .filter(Task.id == task_id)
        .first()
    )
    if not task:
        raise ValueError("Task not found")

    updates = payload.dict(exclude_unset=True)
    for field, value in updates.items():
        setattr(task, field, value)

    if payload.completed is not None:
        if payload.completed:
            task.last_completed = utc_now()
            task.completed = True
            anchor = task.last_scheduled_at or utc_now()
            task.next_due = _compute_next_due(task, anchor)
        else:
            task.completed = False

    if payload.interval_value is not None or payload.interval_unit is not None:
        anchor = task.last_scheduled_at or utc_now()
        task.next_due = _compute_next_due(task, anchor)

    if payload.color is not None:
        for mapping in task.events:
            if mapping.event is not None:
                mapping.event.color = payload.color
                db.add(mapping.event)

    _refresh_completion_probability(db, task)
    db.add(task)
    db.commit()
    db.refresh(task)
    return task


def delete_task(db: Session, task_id: int) -> None:
    task = (
        db.query(Task)
        .options(selectinload(Task.events).selectinload(TaskEvent.event))
        .filter(Task.id == task_id)
        .first()
    )
    if not task:
        raise ValueError("Task not found")
    for mapping in list(task.events):
        try:
            from ..calendar.service import delete_event as calendar_delete_event

            calendar_delete_event(db, mapping.event_id)
        except ValueError:
            continue
    db.delete(task)
    db.commit()


def _has_upcoming_event(task: Task, reference: datetime) -> bool:
    for entry in task.events:
        if entry.event and entry.event.start >= reference and not entry.completed:
            return True
    return False


def _schedule_task(db: Session, task: Task, reference: datetime) -> Optional[ScheduledTaskEvent]:
    from ..calendar.service import create_event as calendar_create_event

    duration = timedelta(minutes=task.duration_minutes)
    reference_local = to_local(reference)
    target_candidate = to_local(task.next_due) if task.next_due else reference_local
    target_start_local = target_candidate if target_candidate > reference_local else reference_local
    optimal_hour = _resolve_optimal_hour(db, task)
    base_start_local = datetime.combine(
        target_start_local.date(),
        time(hour=optimal_hour, minute=0),
        tzinfo=LOCAL_TIMEZONE,
    )
    if base_start_local < reference_local:
        base_start_local = reference_local

    slot_start = _find_free_slot(db, to_utc(base_start_local), duration)
    if slot_start is None:
        return None

    slot_end = slot_start + duration

    payload = EventCreate(
        title=task.title,
        description=task.description,
        start=slot_start,
        end=slot_end,
        category=task.category or DEFAULT_CATEGORY,
        color=task.color,
    )
    event = calendar_create_event(db, payload)

    mapping = TaskEvent(
        task_id=task.id,
        event_id=event.id,
        scheduled_for=slot_start,
    )
    db.add(mapping)

    task.last_scheduled_at = slot_start
    task.next_due = _compute_next_due(task, slot_start)
    task.completed = False
    _refresh_completion_probability(db, task)

    db.add(task)
    db.commit()
    db.refresh(mapping)
    db.refresh(task)

    return ScheduledTaskEvent(
        task_id=task.id,
        event_id=event.id,
        title=event.title,
        start=to_local(event.start),
        end=to_local(event.end),
    )


def schedule_tasks(db: Session) -> ScheduleTasksResponse:
    now = utc_now()
    tasks = list_tasks(db)
    priority_rank = {
        TaskPriority.HIGH: 0,
        TaskPriority.MEDIUM: 1,
        TaskPriority.LOW: 2,
    }
    tasks.sort(key=lambda task: (priority_rank.get(task.priority, 1), -task.completion_probability))

    scheduled: list[ScheduledTaskEvent] = []
    skipped = 0

    for task in tasks:
        if _has_upcoming_event(task, now):
            skipped += 1
            continue
        if task.next_due and task.next_due > now:
            skipped += 1
            continue

        result = _schedule_task(db, task, now)
        if result is None:
            skipped += 1
            continue
        scheduled.append(result)

    return ScheduleTasksResponse(scheduled=len(scheduled), skipped=skipped, entries=scheduled)


def _productive_hours(db: Session) -> list[int]:
    hours = [0] * 24
    rows: Iterable[tuple[datetime]] = (
        db.query(Event.start)
        .join(TaskEvent, TaskEvent.event_id == Event.id)
        .filter(TaskEvent.completed.is_(True))
        .all()
    )
    for (start,) in rows:
        hours[to_local(start).hour] += 1
    return hours


def get_task_stats(db: Session) -> TaskStats:
    now = utc_now()
    total = db.query(func.count(Task.id)).scalar() or 0
    overdue = (
        db.query(func.count(Task.id))
        .filter(Task.next_due.isnot(None), Task.next_due < now, Task.completed.is_(False))
        .scalar()
        or 0
    )
    upcoming = (
        db.query(func.count(Task.id))
        .filter(Task.next_due.isnot(None), Task.next_due >= now, Task.next_due <= now + timedelta(days=7))
        .scalar()
        or 0
    )
    scheduled_events = (
        db.query(func.count(TaskEvent.id))
        .join(Event, TaskEvent.event_id == Event.id)
        .filter(Event.start >= now)
        .scalar()
        or 0
    )
    next_due_row = (
        db.query(Task.next_due)
        .filter(Task.next_due.isnot(None))
        .order_by(Task.next_due.asc())
        .first()
    )
    next_due = next_due_row[0] if next_due_row else None
    next_due_local = to_local(next_due) if next_due else None

    return TaskStats(
        total_tasks=total,
        overdue_tasks=overdue,
        upcoming_tasks=upcoming,
        scheduled_events=scheduled_events,
        productive_hours=_productive_hours(db),
        next_due=next_due_local,
    )


def get_optimal_task_time(db: Session, category: Optional[str] = None) -> OptimalTaskTimeResponse:
    dummy_task = Task(
        title="",
        interval_value=1,
        interval_unit=TaskIntervalUnit.DAY,
        duration_minutes=60,
        category=category,
    )
    hour = _resolve_optimal_hour(db, dummy_task)
    return OptimalTaskTimeResponse(category=category, optimal_time=f"{hour:02d}:00")


def update_task_feedback(db: Session, event: Event, completed: bool) -> None:
    if event.task_link is None:
        return

    task_event = event.task_link
    task_event.completed = completed
    task = task_event.task
    if task is None:
        return

    if completed:
        task.last_completed = utc_now()
        task.completed = True
        task.next_due = _compute_next_due(task, task_event.scheduled_for)
    else:
        task.completed = False
        task.next_due = utc_now()

    _refresh_completion_probability(db, task)
    db.add(task_event)
    db.add(task)


def synchronize_task_schedule(db: Session, task_event: TaskEvent) -> None:
    """Ensure task scheduling metadata stays in sync with a linked calendar event."""
    task = (
        db.query(Task)
        .filter(Task.id == task_event.task_id)
        .options(selectinload(Task.events))
        .first()
    )
    if task is None:
        return

    task.last_scheduled_at = task_event.scheduled_for
    if not task.completed:
        task.next_due = _compute_next_due(task, task_event.scheduled_for)

    _refresh_completion_probability(db, task)
    db.add(task)


def reset_task_schedule(db: Session, task_id: int) -> None:
    """Reset task scheduling details when a linked calendar event is removed."""
    task = (
        db.query(Task)
        .filter(Task.id == task_id)
        .options(selectinload(Task.events))
        .first()
    )
    if task is None:
        return

    now = utc_now()
    remaining_links = list(task.events)
    upcoming = min(
        (mapping for mapping in remaining_links if mapping.scheduled_for >= now),
        default=None,
        key=lambda mapping: mapping.scheduled_for,
    )

    if upcoming is not None:
        task.last_scheduled_at = upcoming.scheduled_for
        if not task.completed:
            task.next_due = _compute_next_due(task, upcoming.scheduled_for)
    else:
        task.last_scheduled_at = None
        task.completed = False
        task.next_due = now

    _refresh_completion_probability(db, task)
    db.add(task)
