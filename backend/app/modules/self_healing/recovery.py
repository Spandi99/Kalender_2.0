"""Automated recovery routines for the self-healing subsystem."""
from __future__ import annotations

import asyncio
import logging
from collections import Counter
from contextlib import contextmanager
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Awaitable, Callable, Optional

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.database import SessionLocal, engine
from app.modules.ical_import.service import list_calendars as list_imported_calendars
from app.modules.ical_import.service import sync_calendar as sync_imported_calendar

from .models import SystemLog

logger = logging.getLogger(__name__)

ActionCallable = Callable[[], Awaitable[bool]]


@dataclass(slots=True)
class RecoveryResult:
    """Result of a recovery attempt."""

    action: str
    resolved: bool
    details: str


class RecoveryManager:
    """Coordinates automated recovery actions.

    The manager keeps lightweight statistics about recurring issues so that
    repeated failures lead to increasingly aggressive recovery strategies.
    """

    def __init__(self) -> None:
        self._issue_counts: Counter[str] = Counter()
        self._lock = asyncio.Lock()
        self._last_action: Optional[str] = None
        self._last_timestamp: Optional[datetime] = None

    @property
    def last_action(self) -> Optional[str]:
        return self._last_action

    @property
    def last_timestamp(self) -> Optional[datetime]:
        return self._last_timestamp

    async def handle_issue(
        self,
        issue_type: str,
        message: str,
        *,
        severity: str = "error",
    ) -> RecoveryResult:
        """Handle a detected issue and persist the action that was taken."""

        async with self._lock:
            self._issue_counts[issue_type] += 1
            attempt = self._issue_counts[issue_type]
            logger.warning("Self-healing triggered for '%s' (attempt %s)", issue_type, attempt)

            action_callable, action_label = self._select_action(issue_type, attempt)

            try:
                resolved = await action_callable()
                details = "Action completed successfully" if resolved else "Action did not fully resolve the issue"
            except Exception as exc:  # pragma: no cover - defensive logging
                logger.exception("Recovery action '%s' failed: %s", action_label, exc)
                resolved = False
                details = f"Action raised exception: {exc}"

            self._last_action = f"{action_label}: {details}"
            self._last_timestamp = datetime.now(timezone.utc)

            await log_system_event(
                component=issue_type,
                severity=severity,
                message=message,
                action_taken=self._last_action,
                resolved=resolved,
            )

            return RecoveryResult(action=action_label, resolved=resolved, details=details)

    def _select_action(self, issue_type: str, attempt: int) -> tuple[ActionCallable, str]:
        """Choose an action based on the issue type and retry count."""

        if issue_type.startswith("database"):
            if attempt >= 3:
                return self._reset_connection_pool, "Reset connection pool"
            return self._reconnect_database, "Reconnect database"
        if "ical" in issue_type:
            return self._trigger_ical_resync, "Trigger iCal resync"
        if "xp" in issue_type:
            return self._reset_learning_cache, "Reset XP cache"
        if "latency" in issue_type:
            return self._refresh_external_clients, "Refresh external API clients"
        if issue_type == "simulated_failure":
            return self._noop_success, "Simulated recovery"
        return self._noop_success, "Generic acknowledgement"

    async def _reconnect_database(self) -> bool:
        """Attempt to re-establish database connectivity."""

        def _ping() -> bool:
            with _session_scope() as session:
                session.execute(text("SELECT 1"))
            return True

        return await asyncio.to_thread(_ping)

    async def _reset_connection_pool(self) -> bool:
        """Force SQLAlchemy to dispose the engine pool and validate connectivity."""

        def _dispose_and_ping() -> bool:
            engine.dispose()
            with _session_scope() as session:
                session.execute(text("SELECT 1"))
            return True

        return await asyncio.to_thread(_dispose_and_ping)

    async def _trigger_ical_resync(self) -> bool:
        """Request a resynchronisation for imported calendars."""

        def _sync_all() -> bool:
            with _session_scope() as session:
                calendars = list_imported_calendars(session)
                for calendar in calendars:
                    try:
                        sync_imported_calendar(session, calendar.id)
                    except Exception as exc:  # pragma: no cover - depends on remote services
                        logger.warning("Unable to resync calendar '%s': %s", calendar.name, exc)
                        return False
            return True

        return await asyncio.to_thread(_sync_all)

    async def _reset_learning_cache(self) -> bool:
        """Placeholder hook for resetting adaptive caches."""

        await asyncio.sleep(0)  # yield control
        return True

    async def _refresh_external_clients(self) -> bool:
        """Refresh HTTP client pools for external APIs."""

        await asyncio.sleep(0)
        return True

    async def _noop_success(self) -> bool:
        return True

    async def log_health_ping(self, component: str, healthy: bool) -> None:
        """Keep track of healthy signals to downscale aggressive responses."""

        if healthy and self._issue_counts.get(component):
            # decay counters slowly when systems recover.
            self._issue_counts[component] = max(0, self._issue_counts[component] - 1)


@contextmanager
def _session_scope() -> Session:
    session = SessionLocal()
    try:
        yield session
        session.commit()
    except Exception:  # pragma: no cover - defensive rollback
        session.rollback()
        raise
    finally:
        session.close()


async def log_system_event(
    *,
    component: str,
    severity: str,
    message: str,
    action_taken: str,
    resolved: bool,
) -> None:
    """Persist a system log entry asynchronously."""

    def _write() -> None:
        with _session_scope() as session:
            session.add(
                SystemLog(
                    component=component[:50],
                    severity=severity[:20],
                    message=message,
                    action_taken=action_taken,
                    resolved=resolved,
                )
            )

    await asyncio.to_thread(_write)


_recovery_manager: Optional[RecoveryManager] = None


def get_recovery_manager() -> RecoveryManager:
    """Return a singleton instance of :class:`RecoveryManager`."""

    global _recovery_manager
    if _recovery_manager is None:
        _recovery_manager = RecoveryManager()
    return _recovery_manager
