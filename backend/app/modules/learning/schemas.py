"""Pydantic schemas for the learning API."""
from __future__ import annotations

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field


class LearningStats(BaseModel):
    clusters: List[float] = Field(default_factory=list)
    average_mood: Optional[float] = None
    average_xp: Optional[float] = None
    total_events: int
    feedback_samples: int
    xp_samples: int
    snapshot_id: Optional[int] = None
    snapshot_created_at: Optional[datetime] = None


class LearningSuggestion(BaseModel):
    block_id: int
    template_id: int
    block_label: str
    current_start: str
    current_end: str
    suggested_start: str
    suggested_end: str
    delta_minutes: int
    reason: str


class LearningSuggestionsResponse(BaseModel):
    stats: Optional[LearningStats] = None
    suggestions: List[LearningSuggestion] = Field(default_factory=list)


class ApplySuggestionsRequest(BaseModel):
    block_ids: List[int] = Field(default_factory=list)


class AppliedSuggestion(BaseModel):
    block_id: int
    template_id: int
    block_label: str
    previous_start: str
    previous_end: str
    new_start: str
    new_end: str
    delta_minutes: int
    reason: str


class ApplySuggestionsResponse(BaseModel):
    applied: int
    updated_blocks: List[AppliedSuggestion] = Field(default_factory=list)
    stats: Optional[LearningStats] = None
