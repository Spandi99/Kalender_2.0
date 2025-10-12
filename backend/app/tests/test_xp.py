import pytest
from fastapi.testclient import TestClient

from ..core.database import Base, get_db
from ..main import app
from .test_calendar import TestingSessionLocal, engine, override_get_db

app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)


@pytest.fixture(autouse=True)
def reset_database() -> None:
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)


def test_xp_totals_endpoint():
    response = client.get("/api/v1/xp/")
    assert response.status_code == 200
    totals = response.json()
    assert totals["total"] == 0

    payload = {
        "title": "XP Event",
        "start_time": "2024-01-01T00:00:00",
        "end_time": "2024-01-01T01:00:00",
        "category": "personal",
    }
    create_response = client.post("/api/v1/calendar/", json=payload)
    event_id = create_response.json()["id"]
    client.post(f"/api/v1/calendar/{event_id}/complete")

    totals_after = client.get("/api/v1/xp/")
    data = totals_after.json()
    assert data["total"] == 30
    assert data["by_category"]["personal"] == 30
