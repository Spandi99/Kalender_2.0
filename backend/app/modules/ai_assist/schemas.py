"""Pydantic schemas for the AI Assist module."""

from typing import Dict, List, Optional

from pydantic import BaseModel


class Recommendation(BaseModel):
    """Represents a recommendation derived from behaviour analysis."""

    title: str
    description: str
    category: Optional[str] = None
    priority: str  # "low", "medium", "high"


class AIInsightsResponse(BaseModel):
    """Aggregated metrics and recommendations for the AI Assist dashboard."""

    total_events: int
    completed_events: int
    completion_rate: float
    punctuality_stats: Dict[str, int]
    frequent_reasons: Dict[str, int]
    average_rating: Optional[float]
    recommendations: List[Recommendation]
