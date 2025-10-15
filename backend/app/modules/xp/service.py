from __future__ import annotations

from collections import defaultdict
from datetime import datetime, timedelta
from functools import lru_cache
from typing import Optional

from sqlalchemy.orm import Session

from ..calendar.models import Event
from ..feedback.models import Feedback, Punctuality
from .models import AvatarState, XPLog

XP_RATE_PER_HOUR: dict[str, int] = {
    "work": 20,
    "exercise": 30,
    "study": 25,
    "other": 10,
}
DEFAULT_XP_RATE = 10

_BASE_LEVEL_THRESHOLDS: dict[int, int] = {1: 0, 2: 100, 3: 250, 4: 500, 5: 1000}
_MOTIVATED_DECAY_HOURS = 6


@lru_cache(maxsize=None)
def _xp_for_level(level: int) -> int:
    if level <= 1:
        return 0
    if level in _BASE_LEVEL_THRESHOLDS:
        return _BASE_LEVEL_THRESHOLDS[level]

    previous_level_threshold = _xp_for_level(level - 1)
    prior_threshold = _xp_for_level(level - 2)
    increment = max(previous_level_threshold - prior_threshold, 100)
    return previous_level_threshold + increment * 2


def _resolve_avatar_tier(level: int) -> str:
    if level >= 8:
        return "legendary"
    if level >= 6:
        return "advanced"
    if level >= 4:
        return "intermediate"
    if level >= 2:
        return "novice"
    return "beginner"


def _resolve_avatar_expression(level: int, mood: str) -> str:
    normalized = mood.lower()
    if normalized == "celebrating":
        return "celebrate"
    if normalized == "tired":
        return "tired"
    if normalized in {"motivated", "happy"}:
        return "smile"
    if level <= 1:
        return "neutral"
    return "smile"


def _get_or_create_avatar_state(db: Session, user_id: Optional[int] = 1) -> AvatarState:
    query = db.query(AvatarState)
    if user_id is None:
        instance = query.order_by(AvatarState.id.asc()).first()
    else:
        instance = query.filter(AvatarState.user_id == user_id).first()

    if instance:
        return instance

    instance = AvatarState(user_id=user_id, level=1, mood="neutral")
    db.add(instance)
    db.commit()
    db.refresh(instance)
    return instance


def _maybe_decay_mood(state: AvatarState) -> bool:
    if state.mood != "motivated":
        return False
    if datetime.utcnow() - state.last_update < timedelta(hours=_MOTIVATED_DECAY_HOURS):
        return False
    state.mood = "neutral"
    state.last_update = datetime.utcnow()
    return True


def _resolve_category(category: str | None) -> str:
    if not category:
        return "Other"
    normalized = category.strip()
    if not normalized:
        return "Other"
    return normalized.title()


def _determine_rate(category: str | None) -> int:
    if not category:
        return DEFAULT_XP_RATE
    return XP_RATE_PER_HOUR.get(category.lower(), DEFAULT_XP_RATE)


def _calculate_duration_hours(event: Event) -> float:
    delta = event.end - event.start
    return max(delta.total_seconds() / 3600, 0.0)


def _fetch_latest_feedback(db: Session, event_id: int) -> Feedback | None:
    return (
        db.query(Feedback)
        .filter(Feedback.event_id == event_id)
        .order_by(Feedback.created_at.desc())
        .first()
    )


def _calculate_feedback_modifier(feedback: Feedback | None) -> float:
    if not feedback:
        return 0.0

    modifier = 0.0
    if feedback.rating is not None:
        if feedback.rating >= 4:
            modifier += 0.2
        elif feedback.rating <= 2:
            modifier -= 0.2

    if feedback.punctuality == Punctuality.ON_TIME:
        modifier += 0.1
    elif feedback.punctuality == Punctuality.LATE:
        modifier -= 0.1

    return modifier


def _calculate_streak_bonus(db: Session, event: Event) -> float:
    category = _resolve_category(event.category)
    recent_entries = (
        db.query(XPLog)
        .filter(XPLog.category == category)
        .order_by(XPLog.created_at.desc())
        .limit(3)
        .all()
    )

    streak = 0
    for entry in recent_entries:
        if entry.xp_awarded > 0:
            streak += 1
        else:
            break

    if streak >= 3:
        return 0.15
    if streak >= 2:
        return 0.05
    return 0.0


def calculate_xp_award(event: Event) -> int:
    rate = _determine_rate(event.category)
    hours = _calculate_duration_hours(event)
    if hours <= 0:
        return 0

    raw_xp = rate * hours
    xp_awarded = int(round(raw_xp))
    if xp_awarded <= 0:
        xp_awarded = 1
    return xp_awarded


def award_xp_for_event(db: Session, event: Event) -> int:
    feedback = _fetch_latest_feedback(db, event.id)

    if not event.completed or (feedback and not feedback.completed):
        xp_awarded = 0
    else:
        base_xp = calculate_xp_award(event)
        modifier = _calculate_feedback_modifier(feedback)
        modifier += _calculate_streak_bonus(db, event)
        xp_awarded = max(0, int(round(base_xp * (1 + modifier))))

    existing = db.query(XPLog).filter(XPLog.event_id == event.id).first()
    category = _resolve_category(event.category)

    if existing:
        existing.category = category
        existing.xp_awarded = xp_awarded
        existing.created_at = datetime.utcnow()
        entry = existing
    else:
        entry = XPLog(
            event_id=event.id,
            category=category,
            xp_awarded=xp_awarded,
        )
        db.add(entry)

    db.commit()
    db.refresh(entry)
    return entry.xp_awarded


def get_xp_summary(db: Session) -> dict[str, dict[str, int] | int]:
    totals = defaultdict(int)
    overall = 0
    for entry in db.query(XPLog).all():
        totals[entry.category] += entry.xp_awarded
        overall += entry.xp_awarded
    return {"total": overall, "by_category": dict(totals)}


def get_level_status(db: Session, *, user_id: Optional[int] = 1) -> dict[str, object]:
    summary = get_xp_summary(db)
    total_xp = summary["total"]

    level = 1
    next_threshold = _xp_for_level(level + 1)
    while total_xp >= next_threshold:
        level += 1
        next_threshold = _xp_for_level(level + 1)

    previous_threshold = _xp_for_level(level)
    xp_next: Optional[int] = next_threshold if total_xp < next_threshold else next_threshold

    state = _get_or_create_avatar_state(db, user_id=user_id)
    mood_decay = _maybe_decay_mood(state)

    updated = mood_decay
    if level > state.level:
        state.level = level
        state.mood = "motivated"
        state.last_update = datetime.utcnow()
        updated = True
    elif level < state.level:
        state.level = level
        state.mood = "neutral"
        state.last_update = datetime.utcnow()
        updated = True

    if updated:
        db.add(state)
        db.commit()
        db.refresh(state)

    if xp_next:
        level_range = xp_next - previous_threshold
        if level_range > 0:
            progress = (total_xp - previous_threshold) / level_range
        else:
            progress = 1.0
    else:
        progress = 1.0
    progress = max(0.0, min(progress, 1.0))

    avatar_state = _resolve_avatar_tier(level)
    expression = _resolve_avatar_expression(level, state.mood)

    return {
        "current_level": level,
        "xp_current": total_xp,
        "xp_previous": previous_threshold,
        "xp_next": xp_next,
        "progress": progress,
        "avatar_state": avatar_state,
        "expression": expression,
    }
