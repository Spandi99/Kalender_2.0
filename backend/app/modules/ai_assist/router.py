"""API routes for the AI Assist module."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ...core.database import get_db
from .schemas import AIInsightsResponse
from .service import analyze_user_behavior

router = APIRouter(prefix="/ai", tags=["AI Assist"])


@router.get("/insights", response_model=AIInsightsResponse)
def get_ai_insights(db: Session = Depends(get_db)) -> AIInsightsResponse:
    """Return aggregated insights and recommendations for the current user."""

    return analyze_user_behavior(db)
