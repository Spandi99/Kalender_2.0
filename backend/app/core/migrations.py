"""Database migration and seeding utilities."""
from __future__ import annotations

from contextlib import contextmanager
from typing import Iterable

from sqlalchemy import MetaData, inspect, select, text
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




def _ensure_column(connection, table: str, column: str, ddl: str) -> None:
    inspector = inspect(connection)
    existing_columns = {col["name"] for col in inspector.get_columns(table)}
    if column in existing_columns:
        return
    connection.execute(text(f"ALTER TABLE {table} ADD COLUMN {column} {ddl}"))


def _ensure_additional_columns(connection: Connection) -> None:
    _ensure_column(connection, "events", "color", "VARCHAR(20)")
    _ensure_column(connection, "template_blocks", "color", "VARCHAR(20)")
    _ensure_column(connection, "imported_calendars", "color", "VARCHAR(20)")


TIMEZONE_TARGETS: dict[str, tuple[str, ...]] = {
    "event_categories": ("created_at",),
    "events": ("start", "end", "actual_start", "actual_end", "created_at"),
    "tasks": ("last_completed", "next_due", "last_scheduled_at", "created_at", "updated_at"),
    "task_events": ("scheduled_for", "created_at"),
    "feedback": ("created_at",),
    "imported_calendars": ("last_synced",),
    "imported_events": ("start", "end", "last_updated"),
    "xp_log": ("created_at",),
    "avatar_state": ("last_update",),
    "learning_snapshots": ("created_at",),
    "template_optimization_log": ("created_at",),
}

_LOCAL_TIMEZONE_NAME = "Europe/Zurich"


def _ensure_timezone_columns(connection: Connection) -> None:
    inspector = inspect(connection)
    for table, columns in TIMEZONE_TARGETS.items():
        existing_columns = {col["name"]: col for col in inspector.get_columns(table)}
        for column in columns:
            column_info = existing_columns.get(column)
            if not column_info:
                continue
            column_type = column_info.get("type")
            if getattr(column_type, "timezone", False):
                continue
            quoted_table = f'"{table}"'
            quoted_column = f'"{column}"'
            statement = text(
                f"ALTER TABLE {quoted_table} "
                f"ALTER COLUMN {quoted_column} TYPE TIMESTAMP WITH TIME ZONE "
                f"USING {quoted_column} AT TIME ZONE '{_LOCAL_TIMEZONE_NAME}'"
            )
            connection.execute(statement)

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
        _ensure_additional_columns(connection)
        _ensure_timezone_columns(connection)
    with _session_scope(bind=active_engine) as session:
        seed_default_categories(session)
