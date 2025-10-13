from datetime import datetime, timedelta

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
        "category": "exercise",
    }
    event = client.post("/api/events/", json=payload).json()
    client.post(f"/api/events/{event['id']}/complete")

    feedback_payload = {
        "event_id": event["id"],
        "completed": True,
        "rating": 4,
        "mood": "😊",
        "punctuality": "late",
        "arrival_delay_minutes": 5,
        "duration_variance_minutes": 10,
        "notes": "Felt great",
    }
    response = client.post("/api/feedback/", json=feedback_payload)
    assert response.status_code == 201
    data = response.json()
    assert data["mood"] == "😊"
    assert data["completed"] is True
    assert data["punctuality"] == "late"

    summary = client.get("/api/feedback/summary").json()
    assert summary["average_rating"] >= 0
    assert summary["total_feedback"] == baseline_summary["total_feedback"] + 1
    previous_count = baseline_summary["mood_counts"].get("😊", 0)
    assert summary["mood_counts"].get("😊", 0) == previous_count + 1
    assert summary["completion_rate"] > 0
    assert summary["punctuality_distribution"]["late"] >= 1


def test_incomplete_feedback_requires_no_rating_and_resets_xp():
    now = datetime.utcnow()
    payload = {
        "title": "Missed Event",
        "start": now.isoformat(),
        "end": (now + timedelta(hours=1)).isoformat(),
        "category": "work",
    }
    event = client.post("/api/events/", json=payload).json()
    completion = client.post(f"/api/events/{event['id']}/complete").json()
    xp_awarded = completion["xp_awarded"]

    xp_summary = client.get("/api/xp/summary").json()
    assert xp_summary["total"] >= xp_awarded

    feedback_payload = {
        "event_id": event["id"],
        "completed": False,
        "reason": "no_time",
        "notes": "Could not make it",
    }
    response = client.post("/api/feedback/", json=feedback_payload)
    assert response.status_code == 201
    data = response.json()
    assert data["completed"] is False
    assert data["rating"] is None
    assert data["mood"] is None

    xp_summary_after = client.get("/api/xp/summary").json()
    assert xp_summary_after["total"] == xp_summary["total"] - xp_awarded


def test_late_requires_delay_minutes():
    payload = {
        "title": "Delay Event",
        "start": datetime.utcnow().isoformat(),
        "end": datetime.utcnow().isoformat(),
        "category": "work",
    }
    event = client.post("/api/events/", json=payload).json()
    client.post(f"/api/events/{event['id']}/complete")

    feedback_payload = {
        "event_id": event["id"],
        "completed": True,
        "rating": 5,
        "mood": "😊",
        "punctuality": "late",
    }
    response = client.post("/api/feedback/", json=feedback_payload)
    assert response.status_code == 422
