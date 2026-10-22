"""Four scoped demo identities, with revocable server-side sessions."""

import hashlib
import hmac
import secrets
import time

from fastapi import Request
from fastapi.responses import JSONResponse

from backend import cloud_store

ACCOUNTS = {"farmer": "farmer", "restaurant1": "r1", "restaurant2": "r2", "restaurant3": "r3"}
# Public hackathon credentials, deliberately not represented as production accounts.
PASSWORD_HASH = hashlib.scrypt(b"Harvest@123", salt=b"harvestlink-demo-v1", n=16384, r=8, p=1)
SESSIONS: dict[str, tuple[str, float]] = {}
ATTEMPTS: dict[str, list[float]] = {}


def authenticate(username, password, host):
    recent = [t for t in ATTEMPTS.get(host, []) if t > time.time() - 60]
    ATTEMPTS[host] = recent
    if len(recent) >= 15:
        return None
    valid = hmac.compare_digest(
        hashlib.scrypt(password.encode(), salt=b"harvestlink-demo-v1", n=16384, r=8, p=1),
        PASSWORD_HASH,
    )
    if not valid or username not in ACCOUNTS:
        recent.append(time.time())
        return None
    ATTEMPTS[host] = []
    token = secrets.token_urlsafe(32)
    expires = time.time() + 43200
    if cloud_store.enabled():
        cloud_store.save_session(token, ACCOUNTS[username], expires)
    else:
        SESSIONS[token] = (ACCOUNTS[username], expires)
    return token


def session(request: Request):
    token = request.cookies.get("harvest_session", "")
    if not token:
        return None
    identity = cloud_store.get_session(token) if cloud_store.enabled() else SESSIONS.get(token)
    if identity and identity[1] > time.time():
        return identity[0]
    revoke(token)
    return None


def revoke(token):
    if cloud_store.enabled():
        cloud_store.revoke_session(token)
    else:
        SESSIONS.pop(token, None)


async def protect(request: Request, call_next):
    import os

    path = request.url.path
    public = path in (
        "/api/health",
        "/api/auth/login",
        "/api/auth/session",
        "/api/auth/logout",
        "/api/localize",
    )
    if path.startswith("/api/") and not public and os.getenv("HARVESTLINK_TEST_ROLE_ACCESS") != "1":
        actor = session(request)
        if not actor:
            return JSONResponse({"detail": "Please sign in to continue."}, status_code=401)
        supplied = request.headers.get("x-actor")
        if supplied and supplied != actor:
            return JSONResponse(
                {"detail": "This account cannot access another workspace."}, status_code=403
            )
        headers = [(k, v) for k, v in request.scope["headers"] if k.lower() != b"x-actor"]
        request.scope["headers"] = headers + [(b"x-actor", actor.encode())]
    if request.method not in ("GET", "HEAD", "OPTIONS"):
        origin = request.headers.get("origin")
        if origin:
            from urllib.parse import urlparse

            allowed = {
                request.headers.get("host"),
                "127.0.0.1:5173",
                "127.0.0.1:5174",
                "localhost:5173",
                "localhost:5174",
            }
            if urlparse(origin).netloc not in allowed:
                return JSONResponse({"detail": "Cross-origin request rejected."}, status_code=403)
    return await call_next(request)
