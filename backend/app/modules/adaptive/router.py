from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ...core.database import get_db
from . import service

router = APIRouter(prefix="/adaptive", tags=["Adaptive"])


@router.post("/analyze")
def analyze_and_update(db: Session = Depends(get_db)) -> dict[str, object]:
    stats = service.analyze_behavior(db)
    service.adapt_templates(db, stats)
    return {"status": "ok", "analysis": stats}
