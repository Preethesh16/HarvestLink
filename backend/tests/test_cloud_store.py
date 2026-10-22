"""Run with HARVESTLINK_TEST_POSTGRES_URL against an isolated PostgreSQL database."""

import os

import pytest
from fastapi.testclient import TestClient

from backend import cloud_store, identity
from backend.app import app, initial_state


@pytest.fixture
def cloud(monkeypatch):
    url = os.getenv("HARVESTLINK_TEST_POSTGRES_URL")
    if not url:
        pytest.skip("Isolated PostgreSQL URL not configured")
    monkeypatch.setenv("DATABASE_URL", url)
    with cloud_store.connect() as db:
        cloud_store.initialize(db)
        db.execute("DELETE FROM harvest_state")
        db.execute("DELETE FROM harvest_sessions")
    yield


def test_persistent_state_commit_and_rollback(cloud):
    with cloud_store.transaction(initial_state) as state:
        state["onboarded"] = {"farmer": True}
    assert cloud_store.read(initial_state)[1]["onboarded"]["farmer"] is True
    with pytest.raises(ValueError):
        with cloud_store.transaction(initial_state) as state:
            state["onboarded"] = {}
            raise ValueError("rollback")
    assert cloud_store.read(initial_state)[1]["onboarded"]["farmer"] is True


def test_session_survives_process_memory_clear_and_logout_revokes(cloud):
    client = TestClient(app)
    response = client.post(
        "/api/auth/login", json={"username": "farmer", "password": "Harvest@123"}
    )
    assert response.status_code == 200
    identity.SESSIONS.clear()
    assert client.get("/api/auth/session").json()["actor"] == "farmer"
    assert client.get("/api/state").status_code == 200
    token = client.cookies.get("harvest_session")
    client.post("/api/auth/logout")
    assert cloud_store.get_session(token) is None
    assert client.get("/api/state").status_code == 401
