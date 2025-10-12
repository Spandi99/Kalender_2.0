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
    baseline_summary = client.get("/api/feedback/summary").json()

    payload = {
        "title": "Feedback Event",
        "start": datetime.utcnow().isoformat(),
        "end": datetime.utcnow().isoformat(),
        "category": "health",
    }
    event = client.post("/api/events/", json=payload).json()
    client.post(f"/api/events/{event['id']}/complete")

    feedback_payload = {
        "event_id": event["id"],
        "rating": 4,
        "mood": "energized",
        "notes": "Felt great",
    }
    response = client.post("/api/feedback/", json=feedback_payload)
    assert response.status_code == 201
    data = response.json()
    assert data["mood"] == "energized"

    summary = client.get("/api/feedback/summary").json()
    assert summary["average_rating"] >= 0
    assert summary["total_feedback"] == baseline_summary["total_feedback"] + 1
    previous_count = baseline_summary["mood_counts"].get("energized", 0)
    assert summary["mood_counts"].get("energized", 0) == previous_count + 1
