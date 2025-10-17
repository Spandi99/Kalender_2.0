"""Background monitoring for the self-healing subsystem."""
from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timedelta, timezone
from typing import Optional

from sqlalchemy import func, select, text
from sqlalchemy.exc import SQLAlchemyError

from app.core.database import SessionLocal

from .models import SystemLog
from .recovery import RecoveryManager, get_recovery_manager

logger = logging.getLogger(__name__)

_CHECK_INTERVAL_SECONDS = 30
_monitor_task: Optional[asyncio.Task[None]] = None
_self_healing_active = False
_last_recovery_action: Optional[str] = None
_last_recovery_timestamp: Optional[datetime] = None


async def _monitor_loop() -> None:
    global _last_recovery_action, _last_recovery_timestamp, _self_healing_active

    recovery_manager = get_recovery_manager()
    _self_healing_active = True

    while True:
        try:
            await _perform_checks(recovery_manager)
        except Exception as exc:  # pragma: no cover - defensive logging
            logger.exception("Self-healing monitor encountered an error: %s", exc)
        await asyncio.sleep(_CHECK_INTERVAL_SECONDS)


async def _perform_checks(recovery_manager: RecoveryManager) -> None:
    await _check_database(recovery_manager)
    await _review_unresolved_logs(recovery_manager)
    await _check_latency_patterns(recovery_manager)


async def _check_database(recovery_manager: RecoveryManager) -> None:
    global _last_recovery_action, _last_recovery_timestamp

    def _ping_database() -> bool:
        try:
            with SessionLocal() as session:
                session.execute(text("SELECT 1"))
            return True
        except SQLAlchemyError as exc:  # pragma: no cover - depends on database availability
            logger.error("Database connectivity check failed: %s", exc)
            return False

    healthy = await asyncio.to_thread(_ping_database)
    if healthy:
        await recovery_manager.log_health_ping("database_disconnect", True)
        return

    result = await recovery_manager.handle_issue(
        "database_disconnect",
        "Database connectivity check failed.",
    )
    _last_recovery_action = result.action
    _last_recovery_timestamp = recovery_manager.last_timestamp


async def _review_unresolved_logs(recovery_manager: RecoveryManager) -> None:
    global _last_recovery_action, _last_recovery_timestamp

    cutoff = datetime.now(timezone.utc) - timedelta(minutes=5)

    def _fetch_unresolved() -> list[SystemLog]:
        with SessionLocal() as session:
            stmt = (
                select(SystemLog)
                .where(SystemLog.resolved.is_(False))
                .where(SystemLog.timestamp < cutoff)
                .order_by(SystemLog.timestamp.asc())
            )
            return list(session.execute(stmt).scalars())

    unresolved_logs = await asyncio.to_thread(_fetch_unresolved)
    for entry in unresolved_logs:
        result = await recovery_manager.handle_issue(
            entry.component or "unknown_component",
            f"Retrying unresolved issue from {entry.timestamp.isoformat()}.",
            severity=entry.severity or "warning",
        )
        if result.resolved:
            def _mark_resolved() -> None:
                with SessionLocal() as session:
                    session.query(SystemLog).filter(SystemLog.id == entry.id).update({"resolved": True})
                    session.commit()

            await asyncio.to_thread(_mark_resolved)
        _last_recovery_action = result.action
        _last_recovery_timestamp = recovery_manager.last_timestamp


async def _check_latency_patterns(recovery_manager: RecoveryManager) -> None:
    """Analyse historical logs to detect recurring latency issues."""

    window_start = datetime.now(timezone.utc) - timedelta(minutes=10)

    def _count_recent_latency() -> int:
        with SessionLocal() as session:
            stmt = (
                select(func.count())
                .select_from(SystemLog)
                .where(SystemLog.timestamp >= window_start)
                .where(SystemLog.component.ilike("%latency%"))
            )
            return session.execute(stmt).scalar_one()

    latency_count = await asyncio.to_thread(_count_recent_latency)
    if latency_count >= 3:
        result = await recovery_manager.handle_issue(
            "api_latency",
            "Detected recurring API latency spikes in diagnostics logs.",
            severity="warning",
        )
        global _last_recovery_action, _last_recovery_timestamp
        _last_recovery_action = result.action
        _last_recovery_timestamp = recovery_manager.last_timestamp


def start_self_healing_monitor() -> None:
    """Start the background monitoring task if it is not already running."""

    global _monitor_task

    if _monitor_task is not None and not _monitor_task.done():
        return

    loop = asyncio.get_running_loop()
    _monitor_task = loop.create_task(_monitor_loop(), name="self-healing-monitor")


async def stop_self_healing_monitor() -> None:
    """Cancel the monitor task (used in tests)."""

    global _monitor_task, _self_healing_active

    if _monitor_task is None:
        return

    _monitor_task.cancel()
    try:
        await _monitor_task
    except asyncio.CancelledError:  # pragma: no cover - expected cancellation path
        pass
    finally:
        _monitor_task = None
        _self_healing_active = False


def get_self_healing_status() -> dict[str, object]:
    """Return a snapshot of the self-healing subsystem state."""

    global _last_recovery_action, _last_recovery_timestamp

    try:
        with SessionLocal() as session:
            log_count = session.execute(select(func.count()).select_from(SystemLog)).scalar_one()
    except Exception:  # pragma: no cover - best effort diagnostics
        log_count = 0

    status: dict[str, object] = {
        "self_healing_active": _self_healing_active,
        "last_recovery_action": _last_recovery_action,
        "system_log_entries": log_count,
    }

    if _last_recovery_timestamp is not None:
        status["last_recovery_timestamp"] = _last_recovery_timestamp.isoformat()

    return status


__all__ = [
    "get_self_healing_status",
    "start_self_healing_monitor",
    "stop_self_healing_monitor",
]
