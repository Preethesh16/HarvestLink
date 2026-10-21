.PHONY: setup dev test build demo-data
setup:
	uv sync --extra forecast
	cd frontend && npm ci

dev:
	uv run --extra forecast python scripts/dev.py

test:
	uv run --extra forecast pytest -q
	cd frontend && npm run build

build:
	cd frontend && npm run build

demo-data:
	uv run python -m scripts.export_demo
