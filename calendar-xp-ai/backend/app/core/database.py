from collections.abc import AsyncGenerator

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from .config import settings


class Base(DeclarativeBase):
    """Base class for all SQLAlchemy models."""

    pass


DATABASE_URL = (
    "postgresql+asyncpg://"
    f"{settings.postgres_user}:{settings.postgres_password}@"
    f"{settings.postgres_host}:{settings.postgres_port}/{settings.postgres_db}"
)

engine = create_async_engine(DATABASE_URL, echo=settings.debug, future=True)
async_session_factory = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)


async def get_session() -> AsyncGenerator[AsyncSession, None]:
    """Yield a database session for FastAPI dependency injection."""

    async with async_session_factory() as session:
        yield session


async def database_healthcheck() -> bool:
    """Ping the database to ensure connectivity."""

    async with async_session_factory() as session:
        result = await session.execute(text("SELECT 1"))
        return result.scalar() == 1
