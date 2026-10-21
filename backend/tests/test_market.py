import json
from datetime import UTC, datetime

import httpx
import pytest

from backend import market


def sample():
    return {
        "coverage": "All States/UT",
        "rows": [
            ["Commodity Group", "Commodity", "MSP", "Price (Rs./Quintal)", "Arrival"],
            ["19 Oct, 2026", "18 Oct, 2026", "17 Oct, 2026"],
            [
                "Vegetables",
                "Tomato",
                "-",
                "1,769.29",
                "2,258.44",
                "1777.01",
                "6012",
                "4016",
                "6975",
            ],
        ],
    }


def test_public_report_keeps_dates_and_converts_numbers():
    r = market.parse_public(sample())
    assert r["reporting_date"] == "2026-10-19"
    assert r["records"][0]["price_quintal"] == 1769.29
    assert r["records"][0]["market"] == "All markets (national aggregate)"


@pytest.mark.parametrize("change", ["unit", "duplicate", "negative", "empty", "date"])
def test_invalid_reports_are_not_accepted(change):
    d = sample()
    if change == "unit":
        d["rows"][0][3] = "Price in unknown units"
    if change == "duplicate":
        d["rows"].append(d["rows"][2])
    if change == "negative":
        d["rows"][2][3] = "-10"
    if change == "empty":
        d["rows"] = d["rows"][:2]
    if change == "date":
        d["rows"][1][0] = "19 Oct, 2099"
    with pytest.raises((ValueError, IndexError)):
        market.parse_public(d)


def test_refresh_caches_success_and_limits_upstream_calls(tmp_path, monkeypatch):
    monkeypatch.delenv("DATA_GOV_API_KEY", raising=False)
    calls = []

    def fetch():
        calls.append(1)
        return market.parse_public(sample())

    monkeypatch.setattr(market, "fetch_public", fetch)
    path = tmp_path / "prices.json"
    first = market.refresh(path)
    second = market.refresh(path)
    assert first["refresh_result"] == "fetched"
    assert second["refresh_result"] == "recent_cache"
    assert calls == [1]
    assert json.loads(path.read_text())["retrieved_at"] == first["retrieved_at"]


def test_failed_refresh_preserves_cache_and_timestamp(tmp_path, monkeypatch):
    monkeypatch.delenv("DATA_GOV_API_KEY", raising=False)
    path = tmp_path / "prices.json"
    old = {**market.parse_public(sample()), "retrieved_at": "2026-01-01T00:00:00+00:00"}
    path.write_text(json.dumps(old))
    before = path.read_bytes()

    def fail():
        raise ValueError("Source unavailable")

    monkeypatch.setattr(market, "fetch_public", fail)
    with pytest.raises(ValueError, match="Source unavailable"):
        market.refresh(path)
    assert path.read_bytes() == before
    with pytest.raises(ValueError, match="wait one minute"):
        market.refresh(path)
    assert market.load(path, tmp_path / "missing.json") == old


def test_api_never_guesses_unit_or_exposes_key(monkeypatch):
    original = httpx.Client

    def handler(request):
        assert request.url.params["filters[state]"] == "Karnataka"
        return httpx.Response(
            200,
            json={
                "total": 1,
                "records": [
                    {
                        "commodity": "Tomato",
                        "market": "Bengaluru",
                        "arrival_date": "19/10/2026",
                        "modal_price": "2000",
                        "min_price": "1800",
                        "max_price": "2200",
                    }
                ],
            },
        )

    monkeypatch.setattr(
        httpx, "Client", lambda **kw: original(transport=httpx.MockTransport(handler), **kw)
    )
    result = market.fetch_api("test-private-key")
    assert result["records"][0]["reported_price"] == 2000
    assert result["records"][0]["price_quintal"] is None
    assert "test-private-key" not in json.dumps(result)


def test_current_cache_can_be_loaded_without_external_calls(tmp_path):
    path = tmp_path / "prices.json"
    report = {**market.parse_public(sample()), "retrieved_at": datetime.now(UTC).isoformat()}
    path.write_text(json.dumps(report))
    assert market.load(path, tmp_path / "absent") == report
