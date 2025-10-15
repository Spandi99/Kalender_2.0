from __future__ import annotations

from collections import defaultdict
from datetime import time
from statistics import mean
from typing import Dict, Iterable, List

from sqlalchemy.orm import Session

from ..calendar.models import Event
from ..day_templates.models import TemplateBlock
from ..feedback.models import Feedback
from ..xp.models import XPLog

ProductiveHours = List[int]


def analyze_behavior(db: Session, user_id: int | None = 1) -> Dict[str, object]:
    """Analyze user behaviour using calendar, feedback, and XP history."""

    _ = user_id  # Reserved for multi-user support

    events: List[Event] = db.query(Event).order_by(Event.start.asc()).all()
    feedbacks: List[Feedback] = db.query(Feedback).order_by(Feedback.created_at.asc()).all()
    xp_entries: List[XPLog] = db.query(XPLog).order_by(XPLog.created_at.asc()).all()

    stats: Dict[str, object] = {
        "avg_completion_rate": 0.0,
        "avg_mood": 0.0,
        "productive_hours": [],
        "discipline_streaks": {},
    }

    if events:
        completed_events = [event for event in events if event.completed]
        stats["avg_completion_rate"] = len(completed_events) / len(events)

        productive_hours: ProductiveHours = []
        for event in completed_events:
            start_reference = event.actual_start or event.start
            if start_reference:
                productive_hours.append(start_reference.hour)
        if productive_hours:
            stats["productive_hours"] = productive_hours

    if feedbacks:
        mood_scores = [feedback.rating for feedback in feedbacks if feedback.rating is not None]
        if mood_scores:
            stats["avg_mood"] = mean(mood_scores)

    if xp_entries:
        streaks: Dict[str, int] = defaultdict(int)
        for entry in xp_entries:
            key = entry.category
            if entry.xp_awarded > 0:
                streaks[key] += 1
            else:
                streaks[key] = 0
        stats["discipline_streaks"] = dict(streaks)

    return stats


def _should_shift_block(block: TemplateBlock) -> bool:
    label = (block.label or "").lower()
    category = (block.category or "").lower()
    keywords = ("lern", "learn", "study", "focus", "deep")
    if any(keyword in label for keyword in keywords):
        return True
    if category in {"study", "deep_work", "focus", "learning"}:
        return True
    return False


def _time_to_minutes(value: time) -> int:
    return value.hour * 60 + value.minute


def _minutes_to_time(total_minutes: int, reference: time | None = None) -> time:
    clamped = max(0, min(total_minutes, 23 * 60 + 59))
    hour, minute = divmod(clamped, 60)
    return time(hour=hour, minute=minute, second=0, microsecond=0, tzinfo=getattr(reference, "tzinfo", None))


def _shift_time_by_hours(value: time, hour_shift: int) -> time:
    total_minutes = _time_to_minutes(value) + hour_shift * 60
    return _minutes_to_time(total_minutes, reference=value)


def adapt_templates(db: Session, stats: Dict[str, object]) -> None:
    """Adjust day template blocks to better match the user's productive hours."""

    productive_hours = stats.get("productive_hours")
    if not productive_hours:
        return

    preferred_start = round(mean(productive_hours))
    preferred_start = max(6, min(int(preferred_start), 20))

    blocks: Iterable[TemplateBlock] = db.query(TemplateBlock).all()
    updated = False

    for block in blocks:
        if not _should_shift_block(block):
            continue
        hour_shift = preferred_start - block.start_time.hour
        if hour_shift == 0:
            continue

        new_start = _shift_time_by_hours(block.start_time, hour_shift)
        new_end = _shift_time_by_hours(block.end_time, hour_shift)

        if _time_to_minutes(new_end) <= _time_to_minutes(new_start):
            adjusted_end_minutes = _time_to_minutes(new_start) + 60
            if adjusted_end_minutes > 23 * 60 + 59:
                # Cannot maintain a 60-minute block without exceeding the day.
                continue
            new_end = _minutes_to_time(adjusted_end_minutes, reference=block.end_time)

        block.start_time = new_start
        block.end_time = new_end
        updated = True

    if updated:
        db.commit()
