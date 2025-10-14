import asyncio
import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.exc import OperationalError

from .core.config import get_settings
from .core.migrations import run_migrations
from .modules.ai_assist import router as ai_router
from .modules.calendar import router as calendar_router
from .modules.day_templates import router as templates_router
from .modules.feedback import router as feedback_router
from .modules.xp import router as xp_router

settings = get_settings()
logger = logging.getLogger(__name__)

_database_schema_initialized = False

app = FastAPI(title=settings.app_name)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(calendar_router.router, prefix=settings.api_v1_prefix)
app.include_router(templates_router.router, prefix="/api/templates", tags=["Day Templates"])
app.include_router(xp_router.router, prefix=settings.api_v1_prefix)
app.include_router(feedback_router.router, prefix=settings.api_v1_prefix)
app.include_router(ai_router.router, prefix=settings.api_v1_prefix)


def _create_database_schema() -> None:
    run_migrations()


def _ensure_database_schema_eagerly() -> None:
    global _database_schema_initialized

    if _database_schema_initialized:
        return

    try:
        _create_database_schema()
    except OperationalError as exc:  # pragma: no cover - depends on DB availability
        logger.warning("Eager database initialization failed: %s", exc)
    else:
        _database_schema_initialized = True
        logger.info("Database schema initialized eagerly.")


_ensure_database_schema_eagerly()


@app.on_event("startup")
async def initialize_database() -> None:
    global _database_schema_initialized

    if _database_schema_initialized:
        logger.debug("Database schema already initialized; skipping startup initialization.")
        return

    backoff_seconds = 1.0
    max_attempts = 5

    for attempt in range(1, max_attempts + 1):
        try:
            run_migrations()
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
            logger.info("Database initialization completed successfully.")
            break


@app.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "ok"}
