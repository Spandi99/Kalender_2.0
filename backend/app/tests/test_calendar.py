from datetime import datetime, timedelta

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from ..core.database import Base, get_db
from ..core.migrations import seed_default_categories
from ..main import app

SQLALCHEMY_DATABASE_URL = "sqlite:///./test_calendar.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    try:
        db = TestingSessionLocal()
        seed_default_categories(db)
        db.commit()
        yield db
    finally:
        db.close()


def setup_module() -> None:  # pragma: no cover - setup
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    app.dependency_overrides[get_db] = override_get_db


def teardown_module() -> None:  # pragma: no cover - cleanup
    app.dependency_overrides.pop(get_db, None)
    Base.metadata.drop_all(bind=engine)


def _reset_database() -> None:
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    with TestingSessionLocal() as session:
        seed_default_categories(session)
        session.commit()


@pytest.fixture(autouse=True)
def reset_database() -> None:
    _reset_database()


client = TestClient(app)


def test_create_and_complete_event():
    payload = {
        "title": "Test Event",
        "start": datetime.utcnow().isoformat(),
        "end": (datetime.utcnow() + timedelta(hours=1)).isoformat(),
        "category": "work",
    }
    response = client.post("/api/events/", json=payload)
    assert response.status_code == 201
    event = response.json()
    assert event["title"] == "Test Event"

    complete = client.post(f"/api/events/{event['id']}/complete")
    assert complete.status_code == 200
    data = complete.json()
    assert data["xp_awarded"] == 20


def test_update_event_details():
    create_payload = {
        "title": "Morning Run",
        "start": "2024-01-01T07:00:00",
        "end": "2024-01-01T08:00:00",
        "category": "exercise",
    }
    created = client.post("/api/events/", json=create_payload).json()

    update_payload = {
        "title": "Evening Run",
        "start": "2024-01-01T18:00:00",
        "end": "2024-01-01T19:00:00",
        "category": "study",
    }
    response = client.put(f"/api/events/{created['id']}", json=update_payload)
    assert response.status_code == 200
    updated = response.json()
    assert updated["title"] == "Evening Run"
    assert updated["category"] == "study"
    assert updated["start"].startswith("2024-01-01T18:00:00")


def test_delete_event_removes_event_and_xp():
    payload = {
        "title": "Weekly Review",
        "start": "2024-01-02T10:00:00",
        "end": "2024-01-02T11:00:00",
        "category": "work",
    }
    event = client.post("/api/events/", json=payload).json()

    client.post(f"/api/events/{event['id']}/complete")
    totals_before = client.get("/api/xp/summary").json()
    assert totals_before["total"] == 20

    delete_response = client.delete(f"/api/events/{event['id']}")
    assert delete_response.status_code == 204

    totals_after = client.get("/api/xp/summary").json()
    assert totals_after["total"] == 0
    events = client.get("/api/events/").json()
    assert all(item["id"] != event["id"] for item in events)


def test_create_event_with_unknown_category_returns_400():
    payload = {
        "title": "Mystery",
        "start": "2024-01-03T10:00:00",
        "end": "2024-01-03T11:00:00",
        "category": "unknown",
    }
    response = client.post("/api/events/", json=payload)
    assert response.status_code == 400
    body = response.json()
    assert "Category 'unknown' not found" in body["detail"]


def test_list_categories_returns_seeded_categories():
    response = client.get("/api/events/categories")
    assert response.status_code == 200
    categories = response.json()
    slugs = {category["slug"] for category in categories}
    assert {"work", "exercise", "study", "other"}.issubset(slugs)
