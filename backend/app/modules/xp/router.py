from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ...core.database import get_db
from .schemas import XPSummary
from .service import get_xp_summary

router = APIRouter(prefix="/xp", tags=["xp"])


@router.get("/summary", response_model=XPSummary)
def read_summary(db: Session = Depends(get_db)) -> XPSummary:
    summary = get_xp_summary(db)
    return XPSummary(**summary)
