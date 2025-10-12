from functools import lru_cache
from pydantic import BaseSettings, Field


class Settings(BaseSettings):
    app_name: str = "AI Calendar XP Backend"
    api_v1_prefix: str = "/api"
    database_url: str = Field(
        default="sqlite:///./calendar.db",
        env="DATABASE_URL",
    )
    cors_origins: list[str] = Field(default_factory=lambda: ["http://localhost:5173"])

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
