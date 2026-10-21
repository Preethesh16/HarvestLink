import copy
from concurrent.futures import ThreadPoolExecutor
from datetime import date, timedelta

import pytest
from fastapi.testclient import TestClient

from backend import app as module
from backend.domain import baseline_forecast, seed


@pytest.fixture
def client(tmp_path, monkeypatch):
    monkeypatch.setattr(module, "DB", tmp_path / "test.sqlite3")
    monkeypatch.setenv("NEGOTIATION_MODE", "local")
    monkeypatch.setenv("FORECAST_MODE", "baseline")
    return TestClient(module.app)


def post(c, path, actor="farmer", data=None):
    return c.post("/api/" + path, headers={"X-Actor": actor}, json=data or {})


def get(c, actor="farmer"):
    return c.get("/api/state", headers={"X-Actor": actor}).json()


def selected(c):
    res = post(c, "negotiate", data={"lot_id": "lot_tomato"})
    assert res.status_code == 200, res.text
    offers = res.json()["offers"]
    assert len(offers) == 3
    order = post(c, f"offers/{offers[0]['id']}/select").json()
    return order


def test_complete_trade_and_retry_safety(client):
    order = selected(client)
    oid = order["id"]
    buyer = order["buyer"]
    assert get(client)["lots"][0]["reserved"] == 0
    for action, role in [
        ("confirm", buyer),
        ("fund", buyer),
        ("pickup", "farmer"),
        ("receive", buyer),
        ("release", "farmer"),
    ]:
        first = post(client, f"orders/{oid}/{action}", role)
        assert first.status_code == 200, first.text
        again = post(client, f"orders/{oid}/{action}", role)
        assert again.status_code == 200
    s = get(client)
    lot = s["lots"][0]
    assert lot["reserved"] == 0 and lot["sold"] == order["quantity"]
    assert s["orders"][0]["settled_amount"] == order["total"]
    received = [b for b in get(client, buyer)["inventory"] if b["quantity"] == order["quantity"]]
    assert len(received) == 1


def test_private_state_and_wrong_role(client):
    selected(client)
    farmer = get(client)
    a = get(client, "r1")
    b = get(client, "r2")
    assert "policies" not in farmer and "max_budget" not in farmer["policy"]
    assert farmer["history"] == [] and farmer["inventory"] == []
    assert all(h["actor"] == "r1" for h in a["history"])
    assert all(o["buyer"] == "r2" for o in b["offers"])
    assert post(client, "lots", "r1", {"crop": "Tomato"}).status_code == 403
    assert post(client, f"orders/{farmer['orders'][0]['id']}/fund", "r2").status_code == 403


def test_csv_atomicity_and_duplicate_consumption(client):
    before = get(client)["lots"]
    today = date.today().isoformat()
    raw = f"crop,quantity,ask_price,harvest_date,available_date,unit\nTomato,10,30,{today},{today},kg\nTomato,NaN,30,{today},{today},kg\n"
    res = post(client, "import/harvest", data={"csv": raw})
    assert res.status_code == 422 and "Row 3" in res.text
    assert get(client)["lots"] == before
    template = client.get("/api/templates/consumption.csv").text
    assert post(client, "import/consumption", "r1", {"csv": template}).status_code == 200
    assert post(client, "import/consumption", "r1", {"csv": template}).status_code == 422


def test_budget_limits_no_deal_and_policy_invalidation(client):
    for actor in ("r1", "r2", "r3"):
        assert post(client, "policy", actor, {"max_price": 10}).status_code == 200
    res = post(client, "negotiate", data={"lot_id": "lot_tomato"}).json()
    assert res["offers"] == [] and len(res["excluded"]) == 3
    assert post(client, "policy", "r1", {"max_price": 32}).status_code == 200
    offer = post(client, "negotiate", data={"lot_id": "lot_tomato"}).json()["offers"][0]
    post(client, "policy", data={"min_price": 40})
    assert post(client, f"offers/{offer['id']}/select").status_code == 422


def test_concurrent_selection_does_not_double_reserve(client):
    offers = post(client, "negotiate", data={"lot_id": "lot_tomato"}).json()["offers"]

    def choose(offer):
        return post(client, f"offers/{offer['id']}/select").status_code

    with ThreadPoolExecutor(max_workers=3) as pool:
        codes = list(pool.map(choose, offers))
    assert codes.count(200) == 1
    order = get(client)["orders"][0]

    def confirm(_):
        return post(client, f"orders/{order['id']}/confirm", order["buyer"]).status_code

    with ThreadPoolExecutor(max_workers=3) as pool:
        assert list(pool.map(confirm, range(3))) == [200] * 3
    assert get(client)["lots"][0]["reserved"] == order["quantity"]


def test_cancel_refunds_and_releases(client):
    order = selected(client)
    path = f"orders/{order['id']}"
    post(client, path + "/confirm", order["buyer"])
    post(client, path + "/fund", order["buyer"])
    res = post(client, path + "/cancel").json()
    assert res["refund"] == order["total"]
    assert get(client)["lots"][0]["reserved"] == 0
    assert post(client, path + "/pickup").status_code == 422


def test_expired_reservation_released(client):
    order = selected(client)
    post(client, f"orders/{order['id']}/confirm", order["buyer"])
    with module.transaction() as s:
        s["orders"][0]["expires_at"] = "2000-01-01T00:00:00+00:00"
    s = get(client)
    assert s["orders"][0]["status"] == "expired" and s["lots"][0]["reserved"] == 0


def test_expiry_changes_recommendation():
    s = seed()
    fresh = copy.deepcopy(s)
    for batch in fresh["inventory"]:
        batch["usable_until"] = (date.today() + timedelta(days=7)).isoformat()
    expired = baseline_forecast(s, "r1")
    usable = baseline_forecast(fresh, "r1")
    assert expired["recommended_quantity"] > usable["recommended_quantity"]
    assert expired["expected_waste"] > 0


def test_missing_external_services_fail_honestly(client, monkeypatch):
    monkeypatch.delenv("DATA_GOV_API_KEY", raising=False)
    assert post(client, "market/refresh").status_code == 422
    assert get(client)["market"]["status"] == "demo"
    monkeypatch.setenv("NEGOTIATION_MODE", "openai")
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    res = post(client, "negotiate", data={"lot_id": "lot_tomato"})
    assert res.status_code == 422 and "No local substitution" in res.text
    assert get(client)["offers"] == []


def test_requirements_and_forecast(client):
    assert post(client, "forecast", "r1").status_code == 200
    assert (
        post(client, "requirements", "r1", {"lot_id": "lot_tomato", "quantity": 15}).status_code
        == 200
    )
    result = post(client, "negotiate", "r1", {"lot_id": "lot_tomato"}).json()
    assert len(result["offers"]) == 1 and result["offers"][0]["quantity"] == 15
    assert get(client, "r2")["offers"] == []


def test_replacement_is_scoped_and_atomic(client):
    other = get(client, "r2")["inventory"]
    raw = client.get("/api/templates/inventory.csv").text
    assert post(client, "import/inventory", "r1", {"csv": raw, "replace": True}).status_code == 200
    assert len(get(client, "r1")["inventory"]) == 1
    assert get(client, "r2")["inventory"] == other
    current = get(client, "r1")["inventory"]
    assert (
        post(
            client,
            "import/inventory",
            "r1",
            {"csv": raw.replace("20,kg", "NaN,kg"), "replace": True},
        ).status_code
        == 422
    )
    assert get(client, "r1")["inventory"] == current


def test_changed_quantity_limit_blocks_confirmation(client):
    order = selected(client)
    post(client, "policy", order["buyer"], {"quantity": 1})
    assert post(client, f"orders/{order['id']}/confirm", order["buyer"]).status_code == 422
    assert get(client)["lots"][0]["reserved"] == 0


def test_invalid_agent_output_cannot_create_offer(client, monkeypatch):
    monkeypatch.setattr(module, "propose_price", lambda *args: float("nan"))
    response = post(client, "negotiate", data={"lot_id": "lot_tomato"})
    assert response.status_code == 422
    assert get(client)["offers"] == []


def test_offers_are_distinct_and_within_private_limits(client):
    result = post(client, "negotiate", data={"lot_id": "lot_tomato"}).json()["offers"]
    assert len({o["price"] for o in result}) == 3
    for o in result:
        buyer = get(client, o["buyer"])["policy"]
        assert 24 <= o["price"] <= buyer["max_price"]
        assert o["total"] <= buyer["max_budget"]


def test_unfunded_orders_not_incoming_stock(client):
    order = selected(client)
    before = post(client, "forecast", order["buyer"]).json()
    post(client, f"orders/{order['id']}/confirm", order["buyer"])
    after = post(client, "forecast", order["buyer"]).json()
    assert before["recommended_quantity"] == after["recommended_quantity"]
    post(client, f"orders/{order['id']}/fund", order["buyer"])
    funded = post(client, "forecast", order["buyer"]).json()
    assert funded["recommended_quantity"] < after["recommended_quantity"]
