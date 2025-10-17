"""Autonomous recovery utilities for database stability."""
from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timezone
from typing import Awaitable

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


def _run_coroutine_sync(coro: Awaitable[bool]) -> bool:
    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        return asyncio.run(coro)

    new_loop = asyncio.new_event_loop()
    try:
        return new_loop.run_until_complete(coro)
    finally:
        new_loop.close()


def full_recovery_sequence() -> None:
    """Run the full recovery workflow synchronously."""

    global _LAST_RECOVERY_RUN

    logger.info("🧠 Running full recovery sequence...")
    try:
        ready = _run_coroutine_sync(ensure_database_ready())
    except Exception as exc:  # pragma: no cover - defensive logging only
        logger.exception("Unexpected error during database readiness check: %s", exc)
        return

    if ready:
        auto_repair_schema()
        _LAST_RECOVERY_RUN = datetime.now(timezone.utc)
        logger.info("🚀 Auto-Recovery system online.")
    else:
        logger.error("Recovery aborted – database unavailable.")


def get_last_recovery_run() -> datetime | None:
    """Return the timestamp of the most recent recovery attempt."""

    return _LAST_RECOVERY_RUN
