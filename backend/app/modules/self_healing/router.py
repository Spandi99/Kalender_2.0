"""API endpoints exposing the self-healing subsystem."""
from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.time import LOCAL_TIMEZONE, to_local

from .models import SystemLog
from .monitor import get_self_healing_status
from .recovery import get_recovery_manager
from ..xp.models import XPLog

router = APIRouter(prefix="/api/system", tags=["System Health"])

BACKUP_DIRECTORY = Path("/home/spandi/kalender_backups")


class FailureRequest(BaseModel):
    issue_type: str = Field(default="simulated_failure", description="Type of failure to emulate")
    severity: str = Field(default="error", description="Severity level that should be logged")
    message: str = Field(
        default="Simulated failure triggered via API.",
        description="Diagnostic message to persist alongside the recovery action.",
    )


class SystemLogResponse(BaseModel):
    id: int
    timestamp: str
    component: str | None
    severity: str | None
    message: str | None
    action_taken: str | None
    resolved: bool

    @classmethod
    def from_orm(cls, log: SystemLog) -> "SystemLogResponse":
        return cls(
            id=log.id,
            timestamp=to_local(log.timestamp).isoformat() if log.timestamp else "",
            component=log.component,
            severity=log.severity,
            message=log.message,
            action_taken=log.action_taken,
            resolved=log.resolved,
        )


@router.get("/logs", response_model=list[SystemLogResponse])
def list_system_logs(db: Session = Depends(get_db)) -> list[SystemLogResponse]:
    stmt = select(SystemLog).order_by(SystemLog.timestamp.desc()).limit(20)
    logs = db.execute(stmt).scalars().all()
    return [SystemLogResponse.from_orm(log) for log in logs]


@router.post("/test-failure")
async def simulate_failure(request: FailureRequest) -> dict[str, Any]:
    manager = get_recovery_manager()
    result = await manager.handle_issue(
        request.issue_type,
        request.message,
        severity=request.severity,
    )
    return {
        "status": "triggered",
        "resolved": result.resolved,
        "action": result.action,
        "details": result.details,
        "self_healing": get_self_healing_status(),
    }


@router.get("/status")
def get_status() -> dict[str, Any]:
    return get_self_healing_status()


@router.get("/health")
def system_health(db: Session = Depends(get_db)) -> dict[str, Any]:
    try:
        db.execute(select(1))
        db_connected = True
    except SQLAlchemyError:
        db_connected = False

    latest_backup = None
    if BACKUP_DIRECTORY.exists():
        backups = sorted(BACKUP_DIRECTORY.glob("backup-*.sql"))
        if backups:
            newest = max(backups, key=lambda path: path.stat().st_mtime)
            timestamp = datetime.fromtimestamp(newest.stat().st_mtime, tz=timezone.utc)
            latest_backup = timestamp.astimezone(LOCAL_TIMEZONE).isoformat()

    xp_entries = db.query(XPLog).count()

    return {
        "timezone": "Europe/Zurich",
        "db_connected": db_connected,
        "latest_backup": latest_backup,
        "xp_entries": xp_entries,
    }


__all__ = ["router"]
