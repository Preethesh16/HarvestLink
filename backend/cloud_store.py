"""Shared PostgreSQL state for serverless deployments; local SQLite remains supported."""

import json
import os
from contextlib import contextmanager


def enabled():
    return bool(os.getenv("DATABASE_URL"))


def connect():
    import psycopg

    return psycopg.connect(os.environ["DATABASE_URL"], connect_timeout=10)


def initialize(db):
    ready = db.execute(
        "SELECT to_regclass('harvest_state'), to_regclass('harvest_sessions')"
    ).fetchone()
    if all(ready):
        return
    # Serialize first-ever DDL across concurrent serverless cold starts.
    db.execute("SELECT pg_advisory_xact_lock(17290381)")
    db.execute(
        "CREATE TABLE IF NOT EXISTS harvest_state (id INTEGER PRIMARY KEY, revision INTEGER NOT NULL, body TEXT NOT NULL)"
    )
    db.execute(
        "CREATE TABLE IF NOT EXISTS harvest_sessions (token TEXT PRIMARY KEY, actor TEXT NOT NULL, expires DOUBLE PRECISION NOT NULL)"
    )


@contextmanager
def transaction(seed_state):
    with connect() as db:
        initialize(db)
        # A single shared row matches the existing demo's transactional state model.
        db.execute(
            "INSERT INTO harvest_state VALUES (1,0,%s) ON CONFLICT (id) DO NOTHING",
            (json.dumps(seed_state()),),
        )
        revision, body = db.execute(
            "SELECT revision,body FROM harvest_state WHERE id=1 FOR UPDATE"
        ).fetchone()
        state = json.loads(body)
        yield state
        db.execute(
            "UPDATE harvest_state SET revision=%s,body=%s WHERE id=1",
            (revision + 1, json.dumps(state)),
        )


def read(seed_state):
    with connect() as db:
        initialize(db)
        db.execute(
            "INSERT INTO harvest_state VALUES (1,0,%s) ON CONFLICT (id) DO NOTHING",
            (json.dumps(seed_state()),),
        )
        revision, body = db.execute("SELECT revision,body FROM harvest_state WHERE id=1").fetchone()
        return revision, json.loads(body)


def save_session(token, actor, expires):
    with connect() as db:
        initialize(db)
        db.execute("DELETE FROM harvest_sessions WHERE expires < EXTRACT(EPOCH FROM NOW())")
        db.execute("INSERT INTO harvest_sessions VALUES (%s,%s,%s)", (token, actor, expires))


def get_session(token):
    with connect() as db:
        initialize(db)
        return db.execute(
            "SELECT actor,expires FROM harvest_sessions WHERE token=%s", (token,)
        ).fetchone()


def revoke_session(token):
    with connect() as db:
        initialize(db)
        db.execute("DELETE FROM harvest_sessions WHERE token=%s", (token,))
