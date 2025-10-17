from functools import lru_cache
import json
import os
from typing import Any, Optional

from pydantic import BaseSettings, Field, validator


class Settings(BaseSettings):
    app_name: str = "Kalender"
    api_v1_prefix: str = "/api"
    postgres_server: str = "db"
    postgres_user: str = "postgres"
    postgres_password: str = "postgres"
    postgres_db: str = "calendar_xp"
    database_url: str = Field(
        default_factory=lambda: "postgresql+psycopg2://postgres:postgres@db:5432/calendar_xp",
        env="DATABASE_URL",
    )
    cors_origins: list[str] = Field(
        default_factory=lambda: [
            "http://localhost:5173",
            "http://localhost:8080",
            "http://192.168.1.136:8080",
        ],
        env="BACKEND_CORS_ORIGINS",
    )
    debug_mode: bool = Field(default=False, env="DEBUG_MODE")

    @validator("database_url", pre=True, always=True)
    def ensure_database_url(cls, _value: Optional[str]) -> str:
        if os.getenv("DATABASE_URL"):
            return os.environ["DATABASE_URL"]
        raise RuntimeError("❌ DATABASE_URL not set – please configure environment properly.")

    @validator("cors_origins", pre=True)
    def parse_cors_origins(cls, value: Any) -> Optional[list[str]]:
        if isinstance(value, str):
            value = value.strip()
            if not value:
                return []
            if value.startswith("["):
                origins = json.loads(value)
                if not isinstance(origins, list):
                    raise ValueError("CORS_ORIGINS must be a list of origins")
                return [str(origin).strip() for origin in origins if str(origin).strip()]
            return [origin.strip() for origin in value.split(",") if origin.strip()]
        if isinstance(value, list):
            return value
        return value

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
