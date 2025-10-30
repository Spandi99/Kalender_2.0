from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy.orm import Session

from ...core.database import get_db
from ...core.config import get_settings
from .schemas import LevelStatus, XPSummary
from .service import get_level_status, get_xp_summary, reset_xp_progress

router = APIRouter(tags=["XP"])
settings = get_settings()


@router.get("/summary", response_model=XPSummary)
def read_summary(db: Session = Depends(get_db)) -> XPSummary:
    summary = get_xp_summary(db)
    return XPSummary(**summary)


@router.get("/level", response_model=LevelStatus)
def read_level(db: Session = Depends(get_db)) -> LevelStatus:
    status = get_level_status(db)
    return LevelStatus(**status)


@router.post("/reset")
def reset_xp(
    db: Session = Depends(get_db),
    admin_token: str | None = Header(default=None, alias="X-Admin-Token"),
) -> dict[str, object]:
    expected_token = settings.xp_reset_token
    if expected_token:
        if admin_token != expected_token:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid XP reset token.")
    elif not settings.debug_mode:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="XP reset disabled.")

    summary = reset_xp_progress(db)
    return {"status": "XP reset to baseline", **summary}
