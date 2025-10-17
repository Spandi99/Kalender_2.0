"""Autonomous recovery utilities for database stability."""
from __future__ import annotations

import asyncio
import logging
import threading
from datetime import datetime, timezone
from typing import Awaitable, TypeVar

import sqlalchemy
from sqlalchemy.exc import OperationalError, ProgrammingError

from app.core.database import Base, SessionLocal, engine
from app.core.migrations import run_migrations

logger = logging.getLogger("recovery")

AUTO_RECOVERY_ENABLED = True
_LAST_RECOVERY_RUN: datetime | None = None


async def ensure_database_ready(max_retries: int = 5, delay: float = 2) -> bool:
    """Ensure a working database connection using exponential backoff."""

    current_delay = delay
    for attempt in range(1, max_retries + 1):
        try:
            with SessionLocal() as db:
                db.execute(sqlalchemy.text("SELECT 1"))
        except OperationalError as exc:
            logger.warning("DB not ready (attempt %s/%s): %s", attempt, max_retries, exc)
            await asyncio.sleep(current_delay)
            current_delay *= 2
        else:
            logger.info("✅ Database connection established.")
            return True

    logger.error("❌ Database unreachable after retries.")
    return False


def auto_repair_schema() -> None:
    """Attempt to repair or initialize the database schema."""

    try:
        with engine.begin() as connection:
            Base.metadata.create_all(bind=connection)
        run_migrations()
    except ProgrammingError as exc:
        logger.error("Schema repair failed: %s", exc)
        return
    except OperationalError as exc:
        logger.error("Schema repair encountered database error: %s", exc)
        return

    logger.info("🧱 Schema repair successful.")


T = TypeVar("T")


def _run_coroutine_sync(coro: Awaitable[T]) -> T:
    """Execute ``coro`` synchronously, reusing any active event loop."""

    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        return asyncio.run(coro)

    loop_thread_id = getattr(loop, "_thread_id", None)
    if loop_thread_id is not None and loop_thread_id == threading.get_ident():
        raise RuntimeError(
            "Cannot synchronously execute coroutine while the current thread's event loop is running. "
            "Use the asynchronous recovery API instead."
        )

    future = asyncio.run_coroutine_threadsafe(coro, loop)
    return future.result()


async def full_recovery_sequence_async() -> None:
    """Run the full recovery workflow inside an asyncio event loop."""

    global _LAST_RECOVERY_RUN

    logger.info("🧠 Running full recovery sequence...")
    try:
        ready = await ensure_database_ready()
    except Exception as exc:  # pragma: no cover - defensive logging only
        logger.exception("Unexpected error during database readiness check: %s", exc)
        return

    if ready:
        auto_repair_schema()
        _LAST_RECOVERY_RUN = datetime.now(timezone.utc)
        logger.info("🚀 Auto-Recovery system online.")
    else:
        logger.error("Recovery aborted – database unavailable.")


def full_recovery_sequence() -> None:
    """Run the full recovery workflow synchronously."""

    _run_coroutine_sync(full_recovery_sequence_async())


def get_last_recovery_run() -> datetime | None:
    """Return the timestamp of the most recent recovery attempt."""

    return _LAST_RECOVERY_RUN
