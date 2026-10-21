import pytest
from fastapi.testclient import TestClient

from backend import app as module
from backend import identity


@pytest.fixture
def client(tmp_path, monkeypatch):
    monkeypatch.setattr(module, "DB", tmp_path / "test.sqlite3")
    monkeypatch.delenv("HARVESTLINK_TEST_ROLE_ACCESS", raising=False)
    identity.ATTEMPTS.clear()
    return TestClient(module.app)


def test_requires_login_and_blocks_impersonation(client):
    assert client.get("/api/state").status_code == 401
    assert (
        client.post("/api/auth/login", json={"username": "farmer", "password": "bad"}).status_code
        == 401
    )
    assert (
        client.post(
            "/api/auth/login", json={"username": "restaurant1", "password": "Harvest@123"}
        ).status_code
        == 200
    )
    assert client.get("/api/state").json()["actor"] == "r1"
    assert client.get("/api/state", headers={"X-Actor": "farmer"}).status_code == 403
    assert client.post("/api/reset").status_code == 403
    client.post("/api/auth/logout")
    assert client.get("/api/state").status_code == 401


def test_onboarding_and_language_validation(client):
    client.post("/api/auth/login", json={"username": "farmer", "password": "Harvest@123"})
    assert client.post("/api/auth/onboard", json={"name": "A", "location": ""}).status_code == 422
    assert (
        client.post(
            "/api/auth/onboard", json={"name": "Demo Farm", "location": "Bantwal"}
        ).status_code
        == 200
    )
    assert client.get("/api/auth/session").json()["onboarded"]
    assert (
        client.post("/api/assistant", json={"question": "Hello", "language": "bad"}).status_code
        == 422
    )
    assert (
        client.post("/api/localize", json={"texts": ["Hello"], "language": "en-IN"}).json()[
            "translations"
        ]["Hello"]
        == "Hello"
    )
    assert (
        client.post("/api/localize", json={"texts": ["a" * 1201], "language": "hi-IN"}).status_code
        == 422
    )


def test_cookie_and_origin(client):
    r = client.post("/api/auth/login", json={"username": "farmer", "password": "Harvest@123"})
    assert "HttpOnly" in r.headers["set-cookie"]
    assert "SameSite=strict" in r.headers["set-cookie"]
    assert (
        client.post("/api/auth/logout", headers={"Origin": "https://other.example"}).status_code
        == 403
    )


def test_assistant_is_scoped_and_voice_failure_keeps_text(client, monkeypatch):
    client.post("/api/auth/login", json={"username": "farmer", "password": "Harvest@123"})
    captured = {}

    def reply(question, language, context):
        captured.update(context)
        return "ನಿಮ್ಮ ಬೆಳೆಯನ್ನು ಸೇರಿಸಿ."

    monkeypatch.setattr(module.assistance, "reply", reply)
    result = client.post("/api/assistant", json={"question": "Help", "language": "kn-IN"})
    assert result.status_code == 200
    assert "ನಿಮ್ಮ" in result.json()["text"]
    assert "policy" not in captured and "inventory" not in captured
    monkeypatch.delenv("SARVAM_API_KEY", raising=False)
    voice = client.post(
        "/api/assistant/speech", json={"text": result.json()["text"], "language": "kn-IN"}
    )
    assert voice.status_code == 422
    assert "still read" in voice.json()["detail"]


def test_role_choice_cannot_change_account(client):
    result = client.post(
        "/api/auth/login",
        json={"username": "restaurant1", "password": "Harvest@123", "role": "farmer"},
    )
    assert result.status_code == 403
    assert client.get("/api/auth/session").json()["actor"] is None
    result = client.post(
        "/api/auth/login",
        json={"username": "restaurant1", "password": "Harvest@123", "role": "buyer"},
    )
    assert result.status_code == 200
    assert client.get("/api/state").json()["actor"] == "r1"
