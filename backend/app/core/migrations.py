"""Database migration and seeding utilities."""
from __future__ import annotations

from contextlib import contextmanager
from typing import Iterable

from sqlalchemy.orm import Session

from ..modules.calendar.models import EventCategory
from .database import Base, SessionLocal, engine

DEFAULT_CATEGORIES: Iterable[dict[str, object]] = (
    {"slug": "work", "name": "Work", "xp_value": 50},
    {"slug": "personal", "name": "Personal", "xp_value": 30},
    {"slug": "health", "name": "Health", "xp_value": 40},
    {"slug": "other", "name": "Other", "xp_value": 20},
    {"slug": "general", "name": "General", "xp_value": 20},
)


@contextmanager
def _session_scope() -> Iterable[Session]:
    session = SessionLocal()
    try:
        yield session
        session.commit()
    except Exception:  # pragma: no cover - defensive rollback
        session.rollback()
        raise
    finally:
        session.close()


def seed_default_categories(db: Session) -> None:
    existing_slugs = {
        row[0]
        for row in db.query(EventCategory.slug).all()
    }
    created = False
    for category in DEFAULT_CATEGORIES:
        if category["slug"] in existing_slugs:
            continue
        db.add(EventCategory(**category))
        created = True
    if created:
        db.flush()


def run_migrations() -> None:
    Base.metadata.create_all(bind=engine)
    with _session_scope() as session:
        seed_default_categories(session)
