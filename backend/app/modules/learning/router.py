"""API router for learning and optimization."""
from __future__ import annotations

from datetime import time

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ...core.database import get_db
from . import schemas, service

router = APIRouter(prefix="/learning", tags=["Learning & Optimization"])


@router.get("/suggestions", response_model=schemas.LearningSuggestionsResponse)
def get_learning_suggestions(db: Session = Depends(get_db)) -> schemas.LearningSuggestionsResponse:
    result = service.suggest_template_updates(db)
    return schemas.LearningSuggestionsResponse(
        stats=_serialize_stats(result.stats),
        suggestions=[_serialize_suggestion(item) for item in result.suggestions],
    )


@router.post("/apply", response_model=schemas.ApplySuggestionsResponse)
def apply_selected_suggestions(
    payload: schemas.ApplySuggestionsRequest,
    db: Session = Depends(get_db),
) -> schemas.ApplySuggestionsResponse:
    result = service.apply_suggestions(db, payload.block_ids)
    return schemas.ApplySuggestionsResponse(
        applied=len(result.updated_blocks),
        updated_blocks=[_serialize_applied(item) for item in result.updated_blocks],
        stats=_serialize_stats(result.stats),
    )


def _serialize_stats(stats: service.LearningStatsData | None) -> schemas.LearningStats | None:
    if stats is None:
        return None
    return schemas.LearningStats(
        clusters=list(stats.clusters),
        average_mood=stats.average_mood,
        average_xp=stats.average_xp,
        total_events=stats.total_events,
        feedback_samples=stats.feedback_samples,
        xp_samples=stats.xp_samples,
        snapshot_id=stats.snapshot_id,
        snapshot_created_at=stats.snapshot_created_at,
    )


def _serialize_suggestion(data: service.LearningSuggestionData) -> schemas.LearningSuggestion:
    return schemas.LearningSuggestion(
        block_id=data.block_id,
        template_id=data.template_id,
        block_label=data.block_label,
        current_start=_time_to_string(data.current_start),
        current_end=_time_to_string(data.current_end),
        suggested_start=_time_to_string(data.suggested_start),
        suggested_end=_time_to_string(data.suggested_end),
        delta_minutes=data.delta_minutes,
        reason=data.reason,
    )


def _serialize_applied(data: service.AppliedSuggestionData) -> schemas.AppliedSuggestion:
    return schemas.AppliedSuggestion(
        block_id=data.block_id,
        template_id=data.template_id,
        block_label=data.block_label,
        previous_start=_time_to_string(data.previous_start),
        previous_end=_time_to_string(data.previous_end),
        new_start=_time_to_string(data.new_start),
        new_end=_time_to_string(data.new_end),
        delta_minutes=data.delta_minutes,
        reason=data.reason,
    )


def _time_to_string(value: time) -> str:
    return value.strftime("%H:%M")
