from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ...core.database import get_db
from .schemas import LevelStatus, XPSummary
from .service import get_level_status, get_xp_summary

router = APIRouter(tags=["XP"])


@router.get("/summary", response_model=XPSummary)
def read_summary(db: Session = Depends(get_db)) -> XPSummary:
    summary = get_xp_summary(db)
    return XPSummary(**summary)


@router.get("/level", response_model=LevelStatus)
def read_level(db: Session = Depends(get_db)) -> LevelStatus:
    status = get_level_status(db)
    return LevelStatus(**status)
