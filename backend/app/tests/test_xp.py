from datetime import datetime, timedelta

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import Column, DateTime, ForeignKey, Integer, MetaData, String, Table

from ..core.database import Base, get_db
from ..core.migrations import run_migrations, seed_default_categories
from ..main import app
from ..modules.calendar.models import Event, EventCategory
from ..modules.xp.models import XPLog
from .test_calendar import TestingSessionLocal, engine, override_get_db

app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)


@pytest.fixture(autouse=True)
def reset_database() -> None:
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    with TestingSessionLocal() as session:
        seed_default_categories(session)
        session.commit()


def test_xp_totals_endpoint():
    response = client.get("/api/xp/summary")
    assert response.status_code == 200
    initial_totals = response.json()

    payload = {
        "title": "XP Event",
        "start": "2024-01-01T00:00:00",
        "end": "2024-01-01T01:00:00",
        "category": "study",
    }
    create_response = client.post("/api/events/", json=payload)
    event_id = create_response.json()["id"]
    client.post(f"/api/events/{event_id}/complete")

    totals_after = client.get("/api/xp/summary")
    data = totals_after.json()
    assert data["total"] == initial_totals["total"] + 25
    previous_study = initial_totals["by_category"].get("Study", 0)
    assert data["by_category"].get("Study", 0) == previous_study + 25


def test_level_endpoint_tracks_progression():
    initial = client.get("/api/xp/level")
    assert initial.status_code == 200
    payload = initial.json()
    assert payload["current_level"] == 1
    assert payload["xp_current"] == 0
    assert payload["xp_next"] == 100
    assert payload["avatar_state"] == "beginner"

    event_payload = {
        "title": "Long Study Session",
        "start": "2024-01-02T00:00:00",
        "end": "2024-01-02T05:00:00",
        "category": "study",
    }
    event_response = client.post("/api/events/", json=event_payload)
    assert event_response.status_code in {200, 201}
    event_id = event_response.json()["id"]

    complete_response = client.post(f"/api/events/{event_id}/complete")
    assert complete_response.status_code == 200

    level_after = client.get("/api/xp/level")
    assert level_after.status_code == 200
    level_payload = level_after.json()
    assert level_payload["current_level"] == 2
    assert level_payload["xp_current"] >= 100
    assert level_payload["xp_previous"] == 100
    assert level_payload["xp_next"] == 250
    assert 0.4 <= level_payload["progress"] <= 0.6
    assert level_payload["avatar_state"] == "novice"
    assert level_payload["expression"] in {"smile", "celebrate"}


def test_run_migrations_preserves_legacy_xp_entries() -> None:
    Base.metadata.drop_all(bind=engine)

    EventCategory.__table__.create(bind=engine)
    Event.__table__.create(bind=engine)

    metadata = MetaData()
    with engine.begin() as connection:
        connection.exec_driver_sql("DROP TABLE IF EXISTS xp_entries")
    metadata.reflect(bind=engine, only=("events",))
    legacy_table = Table(
        "xp_entries",
        metadata,
        Column("id", Integer, primary_key=True),
        Column("event_id", Integer, ForeignKey("events.id"), nullable=False, unique=True),
        Column("category", String(50), nullable=False),
        Column("xp_value", Integer, nullable=False),
        Column("created_at", DateTime, nullable=False),
    )
    legacy_table.drop(bind=engine, checkfirst=True)
    legacy_table.create(bind=engine)

    created_at = datetime.utcnow()
    legacy_event_id: int | None = None

    with engine.begin() as connection:
        connection.execute(
            EventCategory.__table__.insert(),
            [
                {
                    "slug": "work",
                    "name": "Work",
                    "xp_value": 20,
                    "created_at": created_at,
                }
            ],
        )
        result = connection.execute(
            Event.__table__.insert().values(
                title="Legacy Event",
                start=created_at,
                end=created_at + timedelta(hours=1),
                category="work",
                description=None,
                completed=True,
            )
        )
        legacy_event_id = result.inserted_primary_key[0]
        connection.execute(
            legacy_table.insert().values(
                event_id=legacy_event_id,
                category="Work",
                xp_value=55,
                created_at=created_at,
            )
        )

    run_migrations(bind=engine)

    with TestingSessionLocal() as session:
        xp_rows = session.query(XPLog).all()
        assert len(xp_rows) == 1
        xp_entry = xp_rows[0]
        assert xp_entry.event_id == legacy_event_id
        assert xp_entry.xp_awarded == 55
        assert xp_entry.category == "Work"
