from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from ..core.database import Base, get_db
from ..main import app

SQLALCHEMY_DATABASE_URL = "sqlite:///./test_cors.db"
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


def test_cors_allows_configured_origin():
    origin = "http://localhost:5173"

    response = client.get("/api/events/", headers={"Origin": origin})

    assert response.status_code == 200
    assert response.headers.get("access-control-allow-origin") == origin
