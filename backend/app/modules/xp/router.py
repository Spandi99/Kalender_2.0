from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ...core.database import get_db
from .schemas import XPTotals
from .service import get_xp_totals

router = APIRouter(prefix="/xp", tags=["xp"])


@router.get("/", response_model=XPTotals)
def read_totals(db: Session = Depends(get_db)) -> XPTotals:
    totals = get_xp_totals(db)
    return XPTotals(total=sum(totals.values()), by_category=totals)
