"""Start both local services; reads .env without printing credentials."""

import os
import signal
import subprocess
import sys
import time
from pathlib import Path

root = Path(__file__).resolve().parents[1]
os.chdir(root)
if (root / ".env").exists():
    for line in (root / ".env").read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        if value.strip():
            os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))
children = []


def stop(*_):
    for p in children:
        if p.poll() is None:
            p.terminate()
    for p in children:
        try:
            p.wait(timeout=5)
        except subprocess.TimeoutExpired:
            p.kill()
    sys.exit(0)


signal.signal(signal.SIGINT, stop)
signal.signal(signal.SIGTERM, stop)
try:
    children.append(
        subprocess.Popen(
            [
                sys.executable,
                "-m",
                "uvicorn",
                "backend.app:app",
                "--host",
                "127.0.0.1",
                "--port",
                "8000",
            ]
        )
    )
    children.append(
        subprocess.Popen(["npm", "run", "dev", "--", "--host", "127.0.0.1"], cwd=root / "frontend")
    )
    print("HarvestLink: http://127.0.0.1:5173 — local synthetic demonstration", flush=True)
    while all(p.poll() is None for p in children):
        time.sleep(0.5)
finally:
    stop()
