import pytest
from httpx import AsyncClient

from app.main import app


@pytest.mark.asyncio
async def test_healthcheck_returns_ok(monkeypatch):
    async def fake_healthcheck():
        return True

    monkeypatch.setattr("app.main.database_healthcheck", fake_healthcheck)

    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.get("/healthz")

    assert response.status_code == 200
    data = response.json()
    assert data["data"]["database"] is True
    assert "version" in data["data"]
