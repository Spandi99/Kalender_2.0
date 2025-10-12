from datetime import datetime

from fastapi.testclient import TestClient

from ..core.database import Base, get_db
from ..main import app
from .test_calendar import TestingSessionLocal, engine, override_get_db

Base.metadata.drop_all(bind=engine)
Base.metadata.create_all(bind=engine)

app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)


def test_feedback_flow():
    payload = {
        "title": "Feedback Event",
        "start_time": datetime.utcnow().isoformat(),
        "end_time": datetime.utcnow().isoformat(),
        "category": "health",
    }
    event = client.post("/api/v1/calendar/", json=payload).json()
    client.post(f"/api/v1/calendar/{event['id']}/complete")

    feedback_payload = {
        "event_id": event["id"],
        "rating": 4,
        "mood": "energized",
        "notes": "Felt great",
    }
    response = client.post("/api/v1/feedback/", json=feedback_payload)
    assert response.status_code == 201
    data = response.json()
    assert data["mood"] == "energized"

    summary = client.get("/api/v1/feedback/summary").json()
    assert summary["average_rating"] == 4
    assert summary["mood_counts"]["energized"] == 1
