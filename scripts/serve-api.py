"""Run the API with ignored local credentials; never print environment values."""

import os
from pathlib import Path

import uvicorn

for line in Path(".env").read_text().splitlines() if Path(".env").exists() else []:
    if "=" in line and not line.strip().startswith("#"):
        key, value = line.split("=", 1)
        if value.strip():
            os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))
uvicorn.run("backend.app:app", host="127.0.0.1", port=int(os.getenv("API_PORT", "8000")))
