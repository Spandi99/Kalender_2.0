import pytest
from fastapi.testclient import TestClient

from ..core.database import Base, get_db
from ..core.migrations import seed_default_categories
from ..main import app
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
    response = client.get("/api/xp/")
    assert response.status_code == 200
    initial_totals = response.json()

    payload = {
        "title": "XP Event",
        "start": "2024-01-01T00:00:00",
        "end": "2024-01-01T01:00:00",
        "category": "personal",
    }
    create_response = client.post("/api/events/", json=payload)
    event_id = create_response.json()["id"]
    client.post(f"/api/events/{event_id}/complete")

    totals_after = client.get("/api/xp/")
    data = totals_after.json()
    assert data["total"] == initial_totals["total"] + 30
    previous_personal = initial_totals["by_category"].get("personal", 0)
    assert data["by_category"].get("personal", 0) == previous_personal + 30
