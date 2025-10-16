"""Learning and optimization service layer."""
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, time, timedelta
from typing import Sequence

import numpy as np
from sqlalchemy.orm import Session, selectinload
from sklearn.cluster import KMeans

from ..calendar.models import Event
from ..day_templates.models import TemplateBlock
from .models import LearningSnapshot, TemplateOptimizationLog


@dataclass(slots=True)
class LearningStatsData:
    clusters: list[float]
    average_mood: float | None
    average_xp: float | None
    total_events: int
    feedback_samples: int
    xp_samples: int
    snapshot_id: int | None = None
    snapshot_created_at: datetime | None = None


@dataclass(slots=True)
class LearningSuggestionData:
    block_id: int
    template_id: int
    block_label: str
    current_start: time
    current_end: time
    suggested_start: time
    suggested_end: time
    delta_minutes: int
    reason: str


@dataclass(slots=True)
class LearningSuggestionsResult:
    stats: LearningStatsData | None
    suggestions: list[LearningSuggestionData]


@dataclass(slots=True)
class AppliedSuggestionData:
    block_id: int
    template_id: int
    block_label: str
    previous_start: time
    previous_end: time
    new_start: time
    new_end: time
    delta_minutes: int
    reason: str


@dataclass(slots=True)
class AppliedSuggestionsResult:
    stats: LearningStatsData | None
    updated_blocks: list[AppliedSuggestionData]


def learn_productive_hours(db: Session) -> LearningStatsData | None:
    """Analyse completed events, XP and feedback ratings to learn productive hours."""

    events = (
        db.query(Event)
        .options(selectinload(Event.feedbacks), selectinload(Event.xp_log_entry))
        .filter(Event.completed.is_(True))
        .all()
    )

    if not events:
        return None

    hours: list[list[float]] = []
    feedback_scores: list[float] = []
    xp_values: list[float] = []

    for event in events:
        start_time = event.actual_start or event.start
        if start_time is None:
            continue
        hours.append([start_time.hour + start_time.minute / 60.0])

        for fb in event.feedbacks:
            if fb.rating is not None:
                feedback_scores.append(float(fb.rating))

        if event.xp_log_entry is not None:
            xp_values.append(float(event.xp_log_entry.xp_awarded))

    if not hours:
        return None

    n_clusters = min(3, len(hours))
    kmeans = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
    kmeans.fit(hours)

    cluster_centers = sorted(round(value, 2) for value in kmeans.cluster_centers_.flatten().tolist())
    average_mood = float(np.mean(feedback_scores)) if feedback_scores else None
    average_xp = float(np.mean(xp_values)) if xp_values else None

    stats = LearningStatsData(
        clusters=cluster_centers,
        average_mood=average_mood,
        average_xp=average_xp,
        total_events=len(events),
        feedback_samples=len(feedback_scores),
        xp_samples=len(xp_values),
    )

    snapshot = _persist_snapshot(db, stats)
    if snapshot is not None:
        stats.snapshot_id = snapshot.id
        stats.snapshot_created_at = snapshot.created_at

    return stats


def suggest_template_updates(db: Session) -> LearningSuggestionsResult:
    """Generate template optimization suggestions based on learning statistics."""

    stats = learn_productive_hours(db)
    if not stats:
        return LearningSuggestionsResult(stats=None, suggestions=[])

    blocks = (
        db.query(TemplateBlock)
        .options(selectinload(TemplateBlock.template))
        .all()
    )

    suggestions: list[LearningSuggestionData] = []

    for block in blocks:
        if block.start_time is None or not stats.clusters:
            continue

        current_hour = _time_to_hour(block.start_time)
        target_hour = min(stats.clusters, key=lambda value: abs(value - current_hour))
        delta_hours = target_hour - current_hour

        # Require at least a one-hour difference to avoid noisy adjustments.
        if abs(delta_hours) < 1.0:
            continue

        suggested_start = _shift_time(block.start_time, delta_hours)
        suggested_end = _shift_time(block.end_time, delta_hours)
        reason = _build_reason(stats, target_hour)

        suggestions.append(
            LearningSuggestionData(
                block_id=block.id,
                template_id=block.template_id,
                block_label=block.label,
                current_start=block.start_time,
                current_end=block.end_time,
                suggested_start=suggested_start,
                suggested_end=suggested_end,
                delta_minutes=int(round(delta_hours * 60)),
                reason=reason,
            )
        )

    return LearningSuggestionsResult(stats=stats, suggestions=suggestions)


def apply_suggestions(db: Session, block_ids: Sequence[int]) -> AppliedSuggestionsResult:
    """Persist selected template updates and record an audit trail."""

    selection = {int(block_id) for block_id in block_ids}
    if not selection:
        stats = learn_productive_hours(db)
        return AppliedSuggestionsResult(stats=stats, updated_blocks=[])

    suggestions_result = suggest_template_updates(db)
    suggestion_index = {suggestion.block_id: suggestion for suggestion in suggestions_result.suggestions}

    if not suggestion_index:
        return AppliedSuggestionsResult(stats=suggestions_result.stats, updated_blocks=[])

    blocks = (
        db.query(TemplateBlock)
        .options(selectinload(TemplateBlock.template))
        .filter(TemplateBlock.id.in_(selection))
        .all()
    )

    applied: list[AppliedSuggestionData] = []

    for block in blocks:
        suggestion = suggestion_index.get(block.id)
        if suggestion is None:
            continue

        previous_start = block.start_time
        previous_end = block.end_time
        block.start_time = suggestion.suggested_start
        block.end_time = suggestion.suggested_end

        optimization_log = TemplateOptimizationLog(
            block_id=block.id,
            template_id=block.template_id,
            old_start_time=previous_start,
            old_end_time=previous_end,
            new_start_time=block.start_time,
            new_end_time=block.end_time,
            delta_minutes=suggestion.delta_minutes,
            reason=suggestion.reason,
            snapshot_id=suggestions_result.stats.snapshot_id if suggestions_result.stats else None,
        )
        db.add(optimization_log)

        applied.append(
            AppliedSuggestionData(
                block_id=block.id,
                template_id=block.template_id,
                block_label=block.label,
                previous_start=previous_start,
                previous_end=previous_end,
                new_start=block.start_time,
                new_end=block.end_time,
                delta_minutes=suggestion.delta_minutes,
                reason=suggestion.reason,
            )
        )

    if applied:
        db.commit()
    else:
        db.rollback()

    return AppliedSuggestionsResult(stats=suggestions_result.stats, updated_blocks=applied)


def _persist_snapshot(db: Session, stats: LearningStatsData) -> LearningSnapshot | None:
    """Store a snapshot if the learned parameters changed."""

    latest_snapshot = (
        db.query(LearningSnapshot)
        .order_by(LearningSnapshot.created_at.desc())
        .first()
    )

    if latest_snapshot and _snapshot_matches(latest_snapshot, stats):
        return latest_snapshot

    snapshot = LearningSnapshot(
        clusters=list(stats.clusters),
        average_mood=stats.average_mood,
        average_xp=stats.average_xp,
        total_events=stats.total_events,
        feedback_samples=stats.feedback_samples,
        xp_samples=stats.xp_samples,
    )
    db.add(snapshot)
    db.commit()
    db.refresh(snapshot)
    return snapshot


def _snapshot_matches(snapshot: LearningSnapshot, stats: LearningStatsData) -> bool:
    def _almost_equal(lhs: float | None, rhs: float | None, tolerance: float = 0.05) -> bool:
        if lhs is None or rhs is None:
            return lhs is None and rhs is None
        return abs(lhs - rhs) <= tolerance

    if snapshot.total_events != stats.total_events:
        return False
    if snapshot.feedback_samples != stats.feedback_samples:
        return False
    if snapshot.xp_samples != stats.xp_samples:
        return False
    if list(snapshot.clusters) != list(stats.clusters):
        return False
    if not _almost_equal(snapshot.average_mood, stats.average_mood):
        return False
    if not _almost_equal(snapshot.average_xp, stats.average_xp):
        return False
    return True


def _time_to_hour(value: time) -> float:
    return value.hour + value.minute / 60.0 + value.second / 3600.0


def _shift_time(value: time, delta_hours: float) -> time:
    base = datetime.combine(datetime.utcnow().date(), value)
    shifted = base + timedelta(hours=delta_hours)
    return shifted.time()


def _build_reason(stats: LearningStatsData, target_hour: float) -> str:
    cluster_time = _format_hour_value(target_hour)
    parts: list[str] = [f"Produktiver Cluster um {cluster_time} Uhr"]
    if stats.average_mood is not None:
        parts.append(f"Ø Stimmung {stats.average_mood:.1f}")
    if stats.average_xp is not None:
        parts.append(f"Ø XP {stats.average_xp:.0f}")
    return " | ".join(parts)


def _format_hour_value(value: float) -> str:
    total_minutes = int(round(value * 60)) % (24 * 60)
    hours, minutes = divmod(total_minutes, 60)
    return f"{hours:02d}:{minutes:02d}"
