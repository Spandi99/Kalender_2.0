import asyncio
import datetime
import logging
import os
import socket

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.exc import OperationalError

from .core.config import get_settings
from .core.database import SessionLocal
from .core.migrations import run_migrations
from .core.middleware import (
    AutoFixMiddleware,
    ExceptionLoggerMiddleware,
    RequestResponseLoggerMiddleware,
)
from .core.recovery import (
    AUTO_RECOVERY_ENABLED,
    full_recovery_sequence_async,
)
from .modules.ai_assist import router as ai_router
from .modules.adaptive import router as adaptive_router
from .modules.calendar import router as calendar_router
from .modules.day_templates import router as templates_router
from .modules.feedback import router as feedback_router
from .modules.ical_import import router as ical_router
from .modules.ical_import.service import (
    list_calendars as list_imported_calendars,
    sync_calendar as sync_imported_calendar,
)
from .modules.learning import router as learning_router
from .modules.self_healing.monitor import start_self_healing_monitor
from .modules.self_healing.router import router as system_router
from .modules.tasks import router as tasks_router
from .modules.xp import router as xp_router

settings = get_settings()
logger = logging.getLogger(__name__)

_database_schema_initialized = False

app = FastAPI(title="AI Calendar XP", openapi_url="/api/openapi.json")
app.add_middleware(ExceptionLoggerMiddleware)
app.add_middleware(AutoFixMiddleware)

if settings.debug_mode:
    app.add_middleware(RequestResponseLoggerMiddleware)

origins = settings.cors_origins or [
    "https://orgalifer.ch",
    "http://orgalifer.ch",
    "http://localhost:8080",
    "http://192.168.1.136:8080",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(calendar_router.router, prefix="/api/events", tags=["Events"])
app.include_router(ical_router.router, prefix="/api/ical", tags=["iCal"])
app.include_router(feedback_router.router, prefix="/api/feedback", tags=["Feedback"])
app.include_router(xp_router.router, prefix="/api/xp", tags=["XP"])
app.include_router(templates_router.router, prefix="/api/templates", tags=["Day Templates"])
app.include_router(tasks_router.router, prefix="/api/tasks", tags=["Tasks"])
app.include_router(ai_router.router, prefix=settings.api_v1_prefix)
app.include_router(adaptive_router.router, prefix=settings.api_v1_prefix)
app.include_router(learning_router.router, prefix=settings.api_v1_prefix)
app.include_router(system_router, prefix="", tags=["System Health"])


def _create_database_schema() -> None:
    logger.info("🧱 Running schema migrations...")
    run_migrations()
    logger.info("✅ Schema migration complete.")
    with SessionLocal() as session:
        event_count = session.execute(text("SELECT COUNT(*) FROM events")).scalar() or 0
        logger.info("🧠 Diagnostics: Database OK, %s events found.", event_count)
        logger.info("🧩 Schema validated successfully.")


def _initialize_database_schema() -> None:
    _create_database_schema()


def _log_event_count() -> None:
    try:
        with SessionLocal() as session:
            count = session.execute(text("SELECT COUNT(*) FROM events")).scalar() or 0
    except Exception as exc:  # pragma: no cover - defensive logging only
        logger.debug("Unable to count events during startup: %s", exc)
    else:
        logger.info("📅 Loaded %s events from database.", count)


def _sync_imported_calendars_on_startup() -> None:
    with SessionLocal() as session:
        calendars = list_imported_calendars(session)
        for calendar in calendars:
            try:
                sync_imported_calendar(session, calendar.id)
            except Exception as exc:  # pragma: no cover - depends on remote availability
                logger.warning(
                    "Failed to sync imported calendar '%s' during startup: %s",
                    calendar.name,
                    exc,
                )


@app.on_event("startup")
async def initialize_database() -> None:
    global _database_schema_initialized

    if _database_schema_initialized:
        logger.debug("Database schema already initialized; skipping startup initialization.")
        return

    backoff_seconds = 1.0
    max_attempts = 5

    if AUTO_RECOVERY_ENABLED:
        try:
            await full_recovery_sequence_async()
        except Exception as exc:  # pragma: no cover - defensive logging only
            logger.exception("⚠️ Auto-Recovery failed: %s", exc)

    for attempt in range(1, max_attempts + 1):
        try:
            _initialize_database_schema()
        except OperationalError as exc:  # pragma: no cover - depends on DB availability
            if attempt == max_attempts:
                logger.exception("Database initialization failed after %s attempts", attempt)
                raise

            logger.warning(
                "Database initialization failed (attempt %s/%s). Retrying in %.1f seconds... (%s)",
                attempt,
                max_attempts,
                backoff_seconds,
                exc,
            )
            await asyncio.sleep(backoff_seconds)
            backoff_seconds *= 2
        else:
            _database_schema_initialized = True
            _log_event_count()
            logger.info("Database initialization completed successfully.")
            _sync_imported_calendars_on_startup()
            start_self_healing_monitor()
            break


@app.get("/api/health")
def health_check() -> dict[str, str]:
    return {"status": "ok", "source": "backend"}


@app.get("/health")
def legacy_health_check() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/health/nginx")
def nginx_status() -> dict[str, str]:
    return {"status": "ok", "via": "nginx"}


@app.get("/api/health/extended")
@app.get("/health/extended")
def health_extended() -> dict[str, object]:
    return {
        "status": "ok",
        "time": datetime.datetime.utcnow().isoformat(),
        "cert_exists": os.path.exists(
            "/etc/letsencrypt/live/orgalifer.ch/fullchain.pem"
        ),
        "services": ["frontend", "backend", "db", "nginx", "certbot"],
    }


@app.get("/health/network")
async def network_status() -> dict[str, object]:
    try:
        socket.create_connection(("db", 5432), timeout=2)
    except Exception as exc:  # pragma: no cover - diagnostics only
        db_status = f"unreachable ({exc})"
    else:
        db_status = "reachable"

    return {
        "backend": "ok",
        "database": db_status,
        "cors_origins": origins,
        "api_prefixes": ["/api/events", "/api/xp", "/api/templates"],
    }
