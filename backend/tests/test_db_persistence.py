import os

from sqlalchemy import text

os.environ.setdefault(
    "DATABASE_URL",
    "postgresql+psycopg2://postgres:postgres@db:5432/calendar_xp",
)

from app.core.database import Base, SessionLocal  # noqa: E402
from app.modules.calendar import models as _calendar_models  # noqa: F401,E402


def test_database_persistence():
    with SessionLocal() as db:
        db.execute(text("SELECT 1"))
    assert "events" in Base.metadata.tables
