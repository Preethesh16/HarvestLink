from datetime import date, timedelta

from backend.domain import current_demand, public_state, seed


def workspace():
    s = seed()
    s["requirements"] = [
        dict(id="a", actor="r1", lot_id="lot_tomato", quantity=40, approved=True),
        dict(id="b", actor="r2", lot_id="lot_tomato", quantity=35, approved=True),
    ]
    return s


def test_demand_is_approved_interest_not_forecast_and_private():
    s = workspace()
    s["requirements"].append(
        dict(id="c", actor="r3", lot_id="lot_tomato", quantity=90, approved=False)
    )
    farmer = public_state(s, "farmer", "local")
    row = farmer["current_demand"]["records"][0]
    assert row["requested_kg"] == 75
    assert row["buyer_count"] == 2
    assert "buyers" not in row and "max_budget" not in str(row)
    assert farmer["requirements"] == []
    assert "current_demand" not in public_state(s, "r1", "local")


def test_agreements_remove_covered_demand_cancel_restores_it():
    s = workspace()
    order = dict(lot_id="lot_tomato", buyer="r1", quantity=40, status="settled")
    s["orders"].append(order)
    assert current_demand(s)["records"][0]["requested_kg"] == 35
    assert current_demand(s)["records"][0]["buyer_count"] == 1
    order["status"] = "cancelled"
    assert current_demand(s)["records"][0]["requested_kg"] == 75
    order.update(status="reserved", expires_at="2000-01-01T00:00:00+00:00")
    assert current_demand(s)["records"][0]["requested_kg"] == 75


def test_future_harvest_and_expired_request():
    s = workspace()
    s["lots"][0]["available_date"] = (date.today() + timedelta(days=1)).isoformat()
    s["requirements"][0]["expires_at"] = "2000-01-01T00:00:00+00:00"
    row = current_demand(s)["records"][0]
    assert row["requested_kg"] == 35
    assert row["available_kg"] == 0
    assert row["lot_ids"] == []
