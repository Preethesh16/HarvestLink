"""Vercel ASGI entry point. Shared state must survive function recycling."""
import os

if os.getenv("VERCEL") and not os.getenv("DATABASE_URL"):
    raise RuntimeError("Configure DATABASE_URL before deploying HarvestLink on Vercel.")

from backend.app import app  # noqa: E402, F401
