from datetime import datetime, timedelta

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from ..core.database import Base, get_db
from ..main import app

SQLALCHEMY_DATABASE_URL = "sqlite:///./test_calendar.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base.metadata.drop_all(bind=engine)
Base.metadata.create_all(bind=engine)


def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()


def setup_module() -> None:  # pragma: no cover - setup
    app.dependency_overrides[get_db] = override_get_db


def teardown_module() -> None:  # pragma: no cover - cleanup
    app.dependency_overrides.pop(get_db, None)


client = TestClient(app)


def test_create_and_complete_event():
    payload = {
        "title": "Test Event",
        "start_time": datetime.utcnow().isoformat(),
        "end_time": (datetime.utcnow() + timedelta(hours=1)).isoformat(),
        "category": "work",
    }
    response = client.post("/api/v1/calendar/", json=payload)
    assert response.status_code == 201
    event = response.json()
    assert event["title"] == "Test Event"

    complete = client.post(f"/api/v1/calendar/{event['id']}/complete")
    assert complete.status_code == 200
    data = complete.json()
    assert data["xp_awarded"] == 50
