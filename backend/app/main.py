import asyncio
import logging
import socket

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.exc import OperationalError

from .core.config import get_settings
from .core.database import Base, SessionLocal
from .core.migrations import run_migrations
from .core.middleware import (
    AutoFixMiddleware,
    ExceptionLoggerMiddleware,
    RequestResponseLoggerMiddleware,
)
from .core.recovery import (
    AUTO_RECOVERY_ENABLED,
    full_recovery_sequence_async,
    get_last_recovery_run,
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
from .modules.self_healing.monitor import (
    get_self_healing_status,
    start_self_healing_monitor,
)
from .modules.self_healing.router import router as system_router
from .modules.xp import router as xp_router

settings = get_settings()
logger = logging.getLogger(__name__)

_database_schema_initialized = False

app = FastAPI(title=settings.app_name)
app.add_middleware(ExceptionLoggerMiddleware)
app.add_middleware(AutoFixMiddleware)

if settings.debug_mode:
    app.add_middleware(RequestResponseLoggerMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*", "https://orgalifer.ch", "http://orgalifer.ch"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _is_service_reachable(host: str, port: int) -> bool:
    try:
        with socket.create_connection((host, port), timeout=1.5):
            return True
    except OSError:
        return False


def _log_unreachable(component: str) -> None:
    logger.error("Subsystem check failed: %s", component)

app.include_router(calendar_router.router, prefix="/api/events", tags=["Events"])
app.include_router(ical_router.router, prefix="/api/ical", tags=["iCal"])
app.include_router(feedback_router.router, prefix="/api/feedback", tags=["Feedback"])
app.include_router(xp_router.router, prefix="/api/xp", tags=["XP"])
app.include_router(templates_router.router, prefix="/api/templates", tags=["Day Templates"])
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


@app.get("/health/network")
def health_network() -> dict[str, object]:
    services = {
        "frontend": ("frontend", 80),
        "backend": ("backend", 8000),
        "db": ("db", 5432),
    }

    reachability = {
        name: _is_service_reachable(host, port)
        for name, (host, port) in services.items()
    }

    status = "ok" if all(reachability.values()) else "degraded"

    return {
        "status": status,
        **reachability,
    }


@app.get("/health/extended")
@app.get(f"{settings.api_v1_prefix}/health/extended", tags=["System Health"])
def extended_health(request: Request) -> dict[str, object]:
    """Provide diagnostics and self-healing status for dashboards."""

    client_host = request.client.host if request.client else "unknown"
    logger.debug("Received extended health check from %s", client_host)

    result: dict[str, object] = {
        "status": "ok",
        "database_connected": False,
        "auto_recovery_enabled": AUTO_RECOVERY_ENABLED,
        "last_recovery_run": None,
    }

    backend_reachable = _is_service_reachable("localhost", 8000) or _is_service_reachable("backend", 8000)

    component_status: dict[str, str] = {
        "frontend": "reachable" if _is_service_reachable("frontend", 80) else "unreachable",
        "backend": "reachable" if backend_reachable else "unreachable",
    }

    expected_origins = {
        "http://localhost",
        "http://orgalifer.ch",
        "https://orgalifer.ch",
    }
    configured_origins = set(settings.cors_origins or [])
    if expected_origins.issubset(configured_origins):
        component_status["cors"] = "ok"
    else:
        component_status["cors"] = "error"

    try:
        with SessionLocal() as db:
            db.execute(text("SELECT 1"))
            result["database_connected"] = True
            result["tables"] = list(Base.metadata.tables.keys())
            result["event_count"] = db.execute(text("SELECT COUNT(*) FROM events")).scalar()

            last_run = get_last_recovery_run()
            if last_run is not None:
                result["last_recovery_run"] = last_run.isoformat()

            result.update(get_self_healing_status())

            try:
                list_imported_calendars(db)
            except Exception as exc:  # pragma: no cover - depends on remote calendar availability
                component_status["ical_module"] = "error"
                logger.debug("iCal module check failed: %s", exc)
            else:
                component_status["ical_module"] = "ok"

            try:
                db.execute(text("SELECT id FROM events LIMIT 1"))
            except Exception as exc:  # pragma: no cover - defensive logging only
                component_status["event_post_test"] = "error"
                logger.debug("Event post test failed: %s", exc)
            else:
                component_status["event_post_test"] = "ok"
    except Exception as exc:  # pragma: no cover - best-effort diagnostics endpoint
        result["status"] = "error"
        result["error"] = str(exc)
        component_status.setdefault("ical_module", "error")
        component_status.setdefault("event_post_test", "error")
        _log_unreachable("database")

    for component, status in component_status.items():
        if status not in {"reachable", "ok"}:
            _log_unreachable(component)

    if any(status not in {"reachable", "ok"} for status in component_status.values()):
        result["status"] = "error"

    result.update(component_status)
    return result
