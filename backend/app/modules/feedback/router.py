from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ...core.database import get_db
from .schemas import FeedbackCreate, FeedbackRead, FeedbackSummary
from .service import create_feedback, get_feedback_summary

router = APIRouter(tags=["Feedback"])


@router.post("/", response_model=FeedbackRead, status_code=status.HTTP_201_CREATED)
@router.post("/submit", response_model=FeedbackRead, status_code=status.HTTP_200_OK)
def submit_feedback(payload: FeedbackCreate, db: Session = Depends(get_db)) -> FeedbackRead:
    try:
        feedback = create_feedback(db, payload)
    except ValueError as exc:  # pragma: no cover - defensive
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    return FeedbackRead.from_orm(feedback)


@router.get("/summary", response_model=FeedbackSummary)
def read_summary(db: Session = Depends(get_db)) -> FeedbackSummary:
    summary = get_feedback_summary(db)
    return FeedbackSummary(**summary)
