from functools import lru_cache
import json
from typing import Any, Optional

from pydantic import BaseSettings, Field, validator


class Settings(BaseSettings):
    app_name: str = "AI Calendar XP Backend"
    api_v1_prefix: str = "/api"
    database_url: str = Field(
        default="sqlite:///./calendar.db",
        env="DATABASE_URL",
    )
    cors_origins: list[str] = Field(
        default_factory=lambda: [
            "http://localhost:5173",
            "http://localhost:8080",
            "http://192.168.1.136:8080",
        ],
        env="CORS_ORIGINS",
    )

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
