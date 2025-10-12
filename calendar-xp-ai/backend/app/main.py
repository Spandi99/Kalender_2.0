from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .core.config import settings
from .core.database import database_healthcheck
from .core.utils import standard_response
from .modules.ai.router import router as ai_router
from .modules.calendar.router import router as calendar_router
from .modules.feedback.router import router as feedback_router
from .modules.xp.router import router as xp_router

app = FastAPI(title=settings.app_name, version=settings.version)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.backend_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(calendar_router)
app.include_router(xp_router)
app.include_router(feedback_router)
app.include_router(ai_router)


@app.get("/healthz")
async def healthcheck() -> dict:
    """Ensure the API and database are reachable."""

    db_ok = await database_healthcheck()
    return standard_response(data={"database": db_ok, "version": settings.version})


@app.get("/")
async def root() -> dict:
    """Root endpoint for uptime verifications."""

    return standard_response(data={"message": "Welcome to AI Calendar XP"})
