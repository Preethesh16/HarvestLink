"""Refresh official reports without substituting generated prices for missing data."""

import json
import math
import os
import subprocess
import threading
import time
from datetime import UTC, date, datetime
from pathlib import Path

import httpx

ROOT = Path(__file__).resolve().parents[1]
SOURCE = "https://agmarknet.gov.in/home"
API = "https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070"
_lock = threading.Lock()
_attempts: dict[str, float] = {}
TTL = 900


def number(value):
    if value is None or str(value).strip() in ("", "-", "—", "NA", "N/A"):
        return None
    n = float(str(value).replace(",", ""))
    if not math.isfinite(n) or n < 0:
        raise ValueError("Invalid government price")
    return n


def parse_public(raw):
    rows = raw["rows"]
    if len(rows) < 3 or "Price" not in " ".join(rows[0]) or "Quintal" not in " ".join(rows[0]):
        raise ValueError("Government report columns or units changed")
    if "All States/UT" not in raw["coverage"]:
        raise ValueError("Unexpected report coverage")
    dates = [datetime.strptime(x, "%d %b, %Y").date() for x in rows[1][:3]]
    if len(dates) != 3 or dates != sorted(dates, reverse=True) or dates[0] > date.today():
        raise ValueError("Invalid reporting dates")
    records = []
    seen = set()
    for r in rows[2:]:
        if len(r) != 9 or not r[1] or r[1] in seen:
            raise ValueError("Incomplete or duplicated government rows")
        seen.add(r[1])
        records.append(
            {
                "group": r[0],
                "commodity": r[1],
                "price_quintal": number(r[3]),
                "previous_price_quintal": number(r[4]),
                "market": "All markets (national aggregate)",
                "reporting_date": dates[0].isoformat(),
                "source_unit": "INR per quintal",
            }
        )
    if not records or not any(r["price_quintal"] is not None for r in records):
        raise ValueError("No published prices returned")
    return {
        "source": "Agmarknet 2.0 · Government of India",
        "source_url": SOURCE,
        "reporting_date": dates[0].isoformat(),
        "previous_reporting_date": dates[1].isoformat(),
        "coverage": "All states / all markets · FAQ grade · published dashboard aggregate",
        "records": records,
        "source_unit": "INR per quintal",
        "provider": "public_dashboard",
    }


def fetch_public():
    result = subprocess.run(
        ["node", str(ROOT / "frontend/scripts/fetch-market.mjs")],
        cwd=ROOT,
        capture_output=True,
        text=True,
        timeout=80,
    )
    if result.returncode:
        raise ValueError(
            "Public Agmarknet report could not be fetched automatically. Saved prices retained. Open the official report to check its latest published prices."
        )
    return parse_public(json.loads(result.stdout))


def fetch_api(key):
    with httpx.Client(timeout=25) as client:
        response = client.get(
            API,
            params={"api-key": key, "format": "json", "limit": 100, "filters[state]": "Karnataka"},
        )
        response.raise_for_status()
        body = response.json()
    records = []
    for r in body.get("records", []):
        d = datetime.strptime(r["arrival_date"], "%d/%m/%Y").date()
        if d > date.today():
            raise ValueError("Future reporting date rejected")
        price = number(r.get("modal_price"))
        if price is None or not r.get("commodity") or not r.get("market"):
            continue
        unit = str(r.get("unit") or "").strip()
        quintal = unit.lower() in ("quintal", "quintals", "qtl", "rs/quintal", "inr per quintal")
        records.append(
            {
                "commodity": r["commodity"],
                "group": "Reported commodity",
                "market": r["market"],
                "district": r.get("district"),
                "state": r.get("state"),
                "variety": r.get("variety"),
                "reporting_date": d.isoformat(),
                "reported_price": price,
                "min_price": number(r.get("min_price")),
                "max_price": number(r.get("max_price")),
                "price_quintal": price if quintal else None,
                "previous_price_quintal": None,
                "source_unit": unit or "Unit not supplied by API",
            }
        )
    if not records:
        raise ValueError("No published prices returned")
    return {
        "source": "data.gov.in / Agmarknet · Government of India",
        "source_url": "https://www.data.gov.in/catalog/current-daily-price-various-commodities-various-markets-mandi",
        "reporting_date": max(r["reporting_date"] for r in records),
        "records": records,
        "coverage": f"Karnataka · up to 100 returned market/variety records ({body.get('total', 'unknown')} matching source records). Dates vary by row.",
        "provider": "data_gov_api",
        "source_unit": "See each source row; missing units are not assumed",
    }


def load(cache: Path, fallback: Path):
    for p in (cache, fallback):
        try:
            report = json.loads(p.read_text())
            if isinstance(report.get("records"), list) and report["records"]:
                return report
        except (OSError, ValueError, TypeError):
            continue
    raise ValueError("No saved government report is available")


def refresh(cache: Path):
    # One collector at a time; a brief cache avoids hammering a public government website.
    if not _lock.acquire(blocking=False):
        raise ValueError("A government price refresh is already running. Please try again shortly.")
    try:
        current = time.time()
        try:
            report = json.loads(cache.read_text())
            fetched = datetime.fromisoformat(report["retrieved_at"]).timestamp()
            if 0 <= current - fetched < TTL:
                return {**report, "refresh_result": "recent_cache"}
        except (OSError, ValueError, KeyError, TypeError):
            pass
        if current - _attempts.get(str(cache), 0) < 60:
            raise ValueError(
                "The previous refresh could not complete. Please wait one minute before retrying; saved prices are unchanged."
            )
        _attempts[str(cache)] = current
        key = os.getenv("DATA_GOV_API_KEY", "").strip()
        try:
            report = fetch_api(key) if key else fetch_public()
        except (httpx.HTTPError, subprocess.SubprocessError, OSError, KeyError, TypeError) as exc:
            raise ValueError(
                "Official price service could not be read. Saved prices retained; check connection or API configuration."
            ) from exc
        report.update(
            retrieved_at=datetime.now(UTC).isoformat(), status="fetched_government_report"
        )
        cache.parent.mkdir(parents=True, exist_ok=True)
        temporary = cache.with_suffix(".tmp")
        temporary.write_text(json.dumps(report, ensure_ascii=False, indent=2))
        temporary.replace(cache)
        return {**report, "refresh_result": "fetched"}
    finally:
        _lock.release()
