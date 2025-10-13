"""Database migration and seeding utilities."""
from __future__ import annotations

from contextlib import contextmanager
from typing import Iterable

from sqlalchemy import MetaData, inspect, select
from sqlalchemy.engine import Connection, Engine
from sqlalchemy.orm import Session, sessionmaker

from ..modules.calendar.models import EventCategory
from .database import Base, SessionLocal, engine

DEFAULT_CATEGORIES: Iterable[dict[str, object]] = (
    {"slug": "work", "name": "Work", "xp_value": 20},
    {"slug": "exercise", "name": "Exercise", "xp_value": 30},
    {"slug": "study", "name": "Study", "xp_value": 25},
    {"slug": "other", "name": "Other", "xp_value": 10},
)


@contextmanager
def _session_scope(bind: Engine | None = None) -> Iterable[Session]:
    if bind is None:
        session = SessionLocal()
    else:
        CustomSession = sessionmaker(bind=bind, autocommit=False, autoflush=False)
        session = CustomSession()
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


def _migrate_legacy_xp_entries(connection: Connection) -> None:
    inspector = inspect(connection)
    tables = set(inspector.get_table_names())
    if "xp_entries" not in tables or "xp_log" not in tables:
        return

    metadata = MetaData()
    metadata.reflect(bind=connection, only=("xp_entries", "xp_log"))
    xp_entries = metadata.tables["xp_entries"]
    xp_log = metadata.tables["xp_log"]

    existing_event_ids = {
        row[0] for row in connection.execute(select(xp_log.c.event_id))
    }

    legacy_rows = connection.execute(
        select(
            xp_entries.c.event_id,
            xp_entries.c.category,
            xp_entries.c.xp_value,
            xp_entries.c.created_at,
        )
    ).mappings()

    to_insert: list[dict[str, object]] = []
    for row in legacy_rows:
        event_id = row["event_id"]
        if event_id in existing_event_ids:
            continue
        to_insert.append(
            {
                "event_id": event_id,
                "category": row["category"],
                "xp_awarded": row["xp_value"],
                "created_at": row["created_at"],
            }
        )
        existing_event_ids.add(event_id)

    if to_insert:
        connection.execute(xp_log.insert(), to_insert)


def run_migrations(bind: Engine | None = None) -> None:
    active_engine = bind or engine

    Base.metadata.create_all(bind=active_engine)
    with active_engine.begin() as connection:
        _migrate_legacy_xp_entries(connection)
    with _session_scope(bind=active_engine) as session:
        seed_default_categories(session)
