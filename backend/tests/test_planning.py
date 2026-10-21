from datetime import date, timedelta

import pytest

from backend.domain import seed
from backend.planning import crop_plan


def test_planning_explains_real_observed_data_and_no_data():
    plan = crop_plan(
        seed(),
        {"location": "Bantwal", "planting_date": date.today().isoformat(), "water": "assured"},
    )
    tomato = next(c for c in plan["cards"] if c["crop"] == "Tomato")
    assert tomato["buyer_count"] == 3
    assert tomato["repeat_demand_14d_kg"] > 0
    assert tomato["observed_days"] == 28
    assert all(c["repeat_demand_14d_kg"] is None for c in plan["cards"] if c["crop"] != "Tomato")
    assert "not committed" in plan["data_label"]
    assert "not a statistical confidence" in plan["method"]


def test_planning_constraints_and_no_history():
    s = seed()
    s["history"] = []
    plan = crop_plan(s, {"location": "Bantwal", "water": "limited", "previous_crop": "Tomato"})
    assert all(c["recommendation"] == "Resolve growing constraints first" for c in plan["cards"])
    assert all(c["repeat_demand_14d_kg"] is None for c in plan["cards"])
    assert next(c for c in plan["cards"] if c["crop"] == "Brinjal")["rotation_caution"]
    with pytest.raises(ValueError):
        crop_plan(
            s,
            {
                "location": "Bantwal",
                "planting_date": (date.today() - timedelta(days=1)).isoformat(),
            },
        )
    with pytest.raises(ValueError):
        crop_plan(s, {"location": "Bantwal", "water": "bad"})
