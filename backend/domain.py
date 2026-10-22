"""Deterministic business rules. Agents never own inventory or payment transitions."""

import copy
import csv
import io
import math
import random
from datetime import UTC, date, datetime, timedelta
from uuid import uuid4


def uid(prefix):
    return f"{prefix}_{uuid4().hex[:12]}"


def now():
    return datetime.now(UTC).isoformat()


def event(s, message, actor="farmer", kind="info"):
    s["events"].append(
        {
            "id": uid("evt"),
            "time": now(),
            "message": message,
            "actor": actor,
            "kind": kind,
        }
    )


def seed():
    today = date.today()
    s = {
        "profiles": [
            {
                "id": "farmer",
                "name": "Ananya Farms",
                "location": "Bantwal, Karnataka",
                "role": "farmer",
                "distance_km": 0,
            },
            {
                "id": "r1",
                "name": "The Green Table",
                "location": "Mangaluru",
                "role": "restaurant",
                "distance_km": 18,
            },
            {
                "id": "r2",
                "name": "Coastal Kitchen",
                "location": "Surathkal",
                "role": "restaurant",
                "distance_km": 28,
            },
            {
                "id": "r3",
                "name": "Roots & Grains",
                "location": "Udupi",
                "role": "restaurant",
                "distance_km": 48,
            },
        ],
        "policies": {
            "farmer": {"min_price": 24, "quantity": 10, "radius_km": 60},
            "r1": {
                "max_price": 32,
                "max_budget": 3000,
                "quantity": 40,
                "radius_km": 60,
            },
            "r2": {
                "max_price": 30,
                "max_budget": 2500,
                "quantity": 35,
                "radius_km": 60,
            },
            "r3": {
                "max_price": 28,
                "max_budget": 2000,
                "quantity": 25,
                "radius_km": 60,
            },
        },
        "lots": [
            {
                "id": "lot_tomato",
                "crop": "Tomato",
                "variety": "Local",
                "grade": "A",
                "quantity": 100.0,
                "reserved": 0.0,
                "sold": 0.0,
                "ask_price": 30.0,
                "harvest_date": today.isoformat(),
                "available_date": today.isoformat(),
                "unit": "kg",
                "farmer": "farmer",
            }
        ],
        "inventory": [],
        "history": [],
        "forecasts": {},
        "requirements": [],
        "offers": [],
        "orders": [],
        "events": [],
        "market": {
            "source": "Synthetic demonstration — not a government quote",
            "status": "demo",
            "reporting_date": today.isoformat(),
            "retrieved_at": None,
            "crop": "Tomato",
            "variety": "Local",
            "market": "Mangaluru (illustrative)",
            "unit": "INR/kg",
            "min_price": 22,
            "modal_price": 28,
            "max_price": 34,
            "records": [],
        },
    }
    rng = random.Random(42)
    for i, actor in enumerate(["r1", "r2", "r3"]):
        for j in range(90):
            day = today - timedelta(days=90 - j)
            usage = round(
                (8 - i * 1.5) * (1.3 if day.weekday() >= 4 else 1) + rng.uniform(-1, 1),
                2,
            )
            s["history"].append(
                {
                    "actor": actor,
                    "date": day.isoformat(),
                    "crop": "Tomato",
                    "quantity": usage,
                    "waste": 0.0,
                    "stockout": False,
                }
            )
        s["inventory"] += [
            {
                "id": uid("batch"),
                "actor": actor,
                "crop": "Tomato",
                "quantity": 12.0,
                "usable_until": today.isoformat(),
                "unit": "kg",
            },
            {
                "id": uid("batch"),
                "actor": actor,
                "crop": "Tomato",
                "quantity": 8.0 + i * 2,
                "usable_until": (today + timedelta(days=3)).isoformat(),
                "unit": "kg",
            },
        ]
    event(
        s,
        "Demo ready. One farm, three independent restaurant workspaces. All seeded records are synthetic.",
    )
    return s


def validate_number(value, name, low=0, high=1000000):
    try:
        result = float(value)
    except (ValueError, TypeError):
        raise ValueError(f"{name} must be a number")
    if not math.isfinite(result) or not low <= result <= high:
        raise ValueError(f"{name} must be between {low} and {high}")
    return round(result, 2)


def add_lot(s, data):
    crop = str(data.get("crop", "")).strip()
    if not crop or len(crop) > 80:
        raise ValueError("Crop is required (maximum 80 characters)")
    harvest = date.fromisoformat(data.get("harvest_date", date.today().isoformat()))
    available = date.fromisoformat(data.get("available_date", harvest.isoformat()))
    if harvest > date.today():
        raise ValueError(
            "This demo accepts harvested stock only; harvest date cannot be in the future"
        )
    if available < harvest:
        raise ValueError("Availability cannot precede harvest")
    if data.get("unit", "kg") != "kg":
        raise ValueError("Demo imports require kilograms (kg)")
    lot = {
        "id": uid("lot"),
        "crop": crop,
        "variety": str(data.get("variety", "Local"))[:80],
        "grade": str(data.get("grade", "A"))[:20],
        "quantity": validate_number(data.get("quantity"), "Quantity", 0.01),
        "reserved": 0.0,
        "sold": 0.0,
        "ask_price": validate_number(data.get("ask_price"), "Asking price", 0.01, 10000),
        "harvest_date": harvest.isoformat(),
        "available_date": available.isoformat(),
        "unit": "kg",
        "farmer": "farmer",
    }
    s["lots"].append(lot)
    return lot


def import_csv(s, actor, kind, raw):
    if len(raw) > 1_000_000:
        raise ValueError("CSV is too large; maximum 1 MB")
    reader = csv.DictReader(io.StringIO(raw.lstrip("\ufeff")))
    required = {
        "harvest": {
            "crop",
            "quantity",
            "ask_price",
            "harvest_date",
            "available_date",
            "unit",
        },
        "inventory": {"crop", "quantity", "usable_until", "unit"},
        "consumption": {"date", "crop", "quantity", "waste", "stockout"},
    }[kind]
    if not reader.fieldnames or not required <= set(reader.fieldnames):
        raise ValueError(
            "Missing columns: " + ", ".join(sorted(required - set(reader.fieldnames or [])))
        )
    records = list(reader)
    if not 0 < len(records) <= 2000:
        raise ValueError("CSV must have between 1 and 2000 data rows")
    if kind == "harvest" and actor != "farmer" or kind != "harvest" and actor == "farmer":
        raise ValueError("This import belongs to a different workspace")
    # Caller persists only after every row validates, giving atomic imports.
    existing = {(r["actor"], r["crop"].lower(), r["date"]) for r in s["history"]}
    for n, row in enumerate(records, 2):
        try:
            if kind == "harvest":
                add_lot(s, row)
            elif kind == "inventory":
                if row["unit"] != "kg":
                    raise ValueError("Inventory unit must be kg")
                expiry = date.fromisoformat(row["usable_until"])
                if not row["crop"].strip():
                    raise ValueError("Crop is required")
                s["inventory"].append(
                    {
                        "id": uid("batch"),
                        "actor": actor,
                        "crop": row["crop"].strip(),
                        "quantity": validate_number(row["quantity"], "Quantity", 0.01),
                        "usable_until": expiry.isoformat(),
                        "unit": "kg",
                    }
                )
            else:
                day = date.fromisoformat(row["date"])
                if day >= date.today():
                    raise ValueError("Consumption must be for a completed past day")
                if not row["crop"].strip():
                    raise ValueError("Crop is required")
                key = (actor, row["crop"].strip().lower(), day.isoformat())
                if key in existing:
                    raise ValueError("Duplicate consumption date/crop; import only new records")
                existing.add(key)
                if row["stockout"].lower() not in ("true", "false", "0", "1"):
                    raise ValueError("stockout must be true or false")
                s["history"].append(
                    {
                        "actor": actor,
                        "crop": row["crop"].strip(),
                        "date": day.isoformat(),
                        "quantity": validate_number(row["quantity"], "Consumption"),
                        "waste": validate_number(row["waste"], "Waste"),
                        "stockout": row["stockout"].lower() in ("true", "1"),
                    }
                )
        except (ValueError, KeyError) as exc:
            raise ValueError(f"Row {n}: {exc}") from exc
    s["forecasts"].pop(actor, None)
    event(s, f"Imported {len(records)} {kind} rows. Import validated atomically.", actor)
    return len(records)


def project_inventory(s, actor, predictions, method, crop="Tomato"):
    today = date.today()
    batches = copy.deepcopy(
        [b for b in s["inventory"] if b["actor"] == actor and b["crop"].lower() == crop.lower()]
    )
    batches.sort(key=lambda b: b["usable_until"])
    incoming = [
        o
        for o in s["orders"]
        if o["buyer"] == actor
        and o["crop"].lower() == crop.lower()
        and o["status"] in ("funded", "picked_up")
    ]
    points, total_waste, total_short, shortage = [], 0.0, 0.0, None
    for i, pred in enumerate(predictions):
        day = today + timedelta(days=i)
        demand = max(0, float(pred))
        waste = sum(b["quantity"] for b in batches if b["usable_until"] < day.isoformat())
        for b in batches:
            if b["usable_until"] < day.isoformat():
                b["quantity"] = 0
        for o in incoming:
            if o["delivery_date"] == day.isoformat():
                batches.append(
                    {
                        "quantity": o["quantity"],
                        "usable_until": (day + timedelta(days=3)).isoformat(),
                    }
                )
        batches.sort(key=lambda b: b["usable_until"])
        remaining = demand
        for b in batches:
            used = min(b["quantity"], remaining)
            b["quantity"] -= used
            remaining -= used
        total_waste += waste
        total_short += remaining
        if remaining > 0.01 and shortage is None:
            shortage = day.isoformat()
        points.append(
            {
                "date": day.isoformat(),
                "demand": round(demand, 2),
                "stock": round(sum(b["quantity"] for b in batches), 2),
                "shortfall": round(remaining, 2),
                "waste": round(waste, 2),
            }
        )
    # Short replenishment window (3 days) avoids buying a week's perishables at once.
    quantity = math.ceil(sum(p["shortfall"] for p in points[:3]))
    return {
        "actor": actor,
        "crop": crop,
        "method": method,
        "points": points,
        "recommended_quantity": quantity,
        "shortage_date": shortage,
        "order_by": (date.fromisoformat(shortage) - timedelta(days=1)).isoformat()
        if shortage
        else None,
        "expected_waste": round(total_waste, 2),
        "current_stock": sum(
            b["quantity"]
            for b in s["inventory"]
            if b["actor"] == actor and b["crop"].lower() == crop.lower()
        ),
        "generated_at": now(),
        "assumptions": "Synthetic usage history; 1-day lead time, 3-day replenishment window. Usable-until is an estimate, not food-safety certification.",
    }


def baseline_forecast(s, actor, crop="Tomato"):
    records = sorted(
        [
            h
            for h in s["history"]
            if h["actor"] == actor and h["crop"].lower() == crop.lower() and not h["stockout"]
        ],
        key=lambda h: h["date"],
    )
    if len(records) < 7:
        raise ValueError("At least seven non-stockout daily consumption records are required")
    values = []
    for i in range(7):
        weekday = (date.today() + timedelta(days=i)).weekday()
        matching = [
            h["quantity"]
            for h in records[-35:]
            if date.fromisoformat(h["date"]).weekday() == weekday
        ]
        values.append(
            sum(matching) / len(matching)
            if matching
            else sum(h["quantity"] for h in records[-7:]) / 7
        )
    return project_inventory(s, actor, values, "Weekday baseline · local demo", crop)


def find(items, identifier):
    for item in items:
        if item["id"] == identifier:
            return item
    raise ValueError("Record not found")


def expire_orders(s):
    changed = False
    for o in s["orders"]:
        if o["status"] in ("awaiting_buyer", "reserved") and o["expires_at"] < now():
            if o["status"] == "reserved":
                find(s["lots"], o["lot_id"])["reserved"] -= o["quantity"]
            o["status"] = "expired"
            changed = True
            event(
                s,
                "Unfunded agreement expired; any reserved stock released.",
                o["buyer"],
            )
    return changed


def current_demand(s):
    """Public buying interest, excluding quantities already covered by agreements."""
    crops = {}
    lots = {lot["id"]: lot for lot in s["lots"]}
    for lot in lots.values():
        key = lot["crop"].strip().casefold()
        row = crops.setdefault(
            key,
            {
                "crop": lot["crop"],
                "requested_kg": 0,
                "available_kg": 0,
                "buyers": set(),
                "lot_ids": [],
            },
        )
        available = max(0, lot["quantity"] - lot["reserved"] - lot["sold"])
        if lot["available_date"] <= date.today().isoformat():
            row["available_kg"] += available
    for req in s["requirements"]:
        lot = lots.get(req["lot_id"])
        if not lot or not req.get("approved"):
            continue
        if req.get("expires_at") and req["expires_at"] < now():
            continue
        covered = sum(
            o["quantity"]
            for o in s["orders"]
            if o["lot_id"] == req["lot_id"]
            and o["buyer"] == req["actor"]
            and o["status"]
            in ("awaiting_buyer", "reserved", "funded", "picked_up", "received", "settled")
            and not (
                o["status"] in ("awaiting_buyer", "reserved") and o.get("expires_at", now()) < now()
            )
        )
        remaining = max(0, req["quantity"] - covered)
        if not remaining:
            continue
        row = crops[lot["crop"].strip().casefold()]
        row["requested_kg"] += remaining
        row["buyers"].add(req["actor"])
        if (
            lot["available_date"] <= date.today().isoformat()
            and lot["quantity"] - lot["reserved"] - lot["sold"] > 0
            and lot["id"] not in row["lot_ids"]
        ):
            row["lot_ids"].append(lot["id"])
    records = []
    for row in crops.values():
        row["buyer_count"] = len(row.pop("buyers"))
        row["requested_kg"] = round(row["requested_kg"], 2)
        row["available_kg"] = round(row["available_kg"], 2)
        records.append(row)
    return {
        "as_of": now(),
        "records": sorted(records, key=lambda r: (-r["requested_kg"], r["crop"])),
    }


def public_state(s, actor, mode):
    result = copy.deepcopy(s)
    result["policy"] = result.pop("policies")[actor]
    result["actor"] = actor
    result["mode"] = mode
    if actor == "farmer":
        result["current_demand"] = current_demand(s)
        result["inventory"] = []
        result["history"] = []
        result["forecasts"] = {}
        result["requirements"] = []
    else:
        for key in ["inventory", "history", "requirements"]:
            result[key] = [r for r in result[key] if r["actor"] == actor]
        result["forecasts"] = (
            {actor: result["forecasts"][actor]} if actor in result["forecasts"] else {}
        )
        result["offers"] = [o for o in result["offers"] if o["buyer"] == actor]
        result["orders"] = [o for o in result["orders"] if o["buyer"] == actor]
    result["events"] = [
        e
        for e in result["events"]
        if e["actor"] == actor or (actor == "farmer" and e["kind"] == "trade")
    ][-60:]
    return result
