"""API endpoints exposing the self-healing subsystem."""
from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db

from .models import SystemLog
from .monitor import get_self_healing_status
from .recovery import get_recovery_manager

router = APIRouter(prefix="/api/system", tags=["System Health"])


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
            timestamp=log.timestamp.isoformat() if log.timestamp else "",
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


__all__ = ["router"]
