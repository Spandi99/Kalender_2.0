from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .core.config import get_settings
from .core.database import Base, engine
from .modules.calendar import router as calendar_router
from .modules.feedback import router as feedback_router
from .modules.xp import router as xp_router

settings = get_settings()

Base.metadata.create_all(bind=engine)

app = FastAPI(title=settings.app_name)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(calendar_router.router, prefix=settings.api_v1_prefix)
app.include_router(xp_router.router, prefix=settings.api_v1_prefix)
app.include_router(feedback_router.router, prefix=settings.api_v1_prefix)


@app.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "ok"}
