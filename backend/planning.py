"""Explainable seasonal shortlist using aggregate observed demand, never promised sales."""

from collections import defaultdict
from datetime import date, timedelta

SOURCES = [
    {
        "title": "ICAR Kharif agro-advisories (2025)",
        "url": "https://www.icar.gov.in/sites/default/files/2025-10/ICAR-En-Kharif-Agro-Advisories-for-Farmers-2025.pdf",
    },
    {
        "title": "ICAR Rabi agro-advisories (2021–22, historical reference)",
        "url": "https://www.icar.gov.in/sites/default/files/2022-09/Rabi-Agro-Advisory-2021-22_0.pdf",
    },
    {"title": "ICAR-IIHR crop guidance", "url": "https://webapps.iihr.res.in/"},
]
# Broad season categories and lead times are demo planning assumptions, not a local crop calendar.
CROPS = [
    {
        "crop": "Tomato",
        "seasons": ["Rabi", "Kharif"],
        "days": 75,
        "start": "transplanting",
        "water": "assured",
        "family": "Solanaceae",
    },
    {
        "crop": "Okra",
        "seasons": ["Kharif", "Summer"],
        "days": 55,
        "start": "sowing",
        "water": "moderate",
        "family": "Malvaceae",
    },
    {
        "crop": "Cucumber",
        "seasons": ["Kharif", "Summer"],
        "days": 55,
        "start": "sowing",
        "water": "assured",
        "family": "Cucurbitaceae",
    },
    {
        "crop": "Brinjal",
        "seasons": ["Rabi", "Kharif"],
        "days": 80,
        "start": "transplanting",
        "water": "assured",
        "family": "Solanaceae",
    },
]


def crop_plan(state, data):
    planting = date.fromisoformat(str(data.get("planting_date", date.today().isoformat())))
    if not date.today() <= planting <= date.today() + timedelta(days=365):
        raise ValueError("Choose a planting date within the next 12 months.")
    water = data.get("water", "assured")
    if water not in ("limited", "moderate", "assured"):
        raise ValueError("Choose your available irrigation level.")
    previous = str(data.get("previous_crop", "")).strip()
    location = str(data.get("location", "")).strip()
    if not 2 <= len(location) <= 120:
        raise ValueError("Enter your farm location (2–120 characters).")
    season = (
        "Kharif"
        if 6 <= planting.month <= 9
        else "Rabi"
        if planting.month in (10, 11, 12, 1, 2)
        else "Summer"
    )
    cutoff = date.today() - timedelta(days=28)
    totals = defaultdict(float)
    buyers = defaultdict(set)
    dates = defaultdict(set)
    for row in state.get("history", []):
        day = date.fromisoformat(row["date"])
        if cutoff <= day < date.today() and not row.get("stockout"):
            crop = row["crop"].lower()
            totals[crop] += float(row.get("consumed", row.get("quantity", 0)))
            buyers[crop].add(row["actor"])
            dates[crop].add(day)
    previous_family = next(
        (c["family"] for c in CROPS if c["crop"].lower() == previous.lower()), None
    )
    cards = []
    for crop in CROPS:
        seasonal = season in crop["seasons"]
        water_ok = water == "assured" or water == "moderate" and crop["water"] == "moderate"
        key = crop["crop"].lower()
        coverage = len(dates[key])
        has_demand = coverage >= 7
        # Total across buyers, averaged over the observed calendar span (missing days not silently invented).
        span = (max(dates[key]) - min(dates[key])).days + 1 if coverage else 0
        repeat_14 = round(totals[key] / span * 14, 1) if has_demand else None
        rotation = previous_family == crop["family"]
        score = int(seasonal) * 4 + int(water_ok) * 2 + int(has_demand) * 2 - int(rotation) * 3
        cards.append(
            {
                **crop,
                "season_match": seasonal,
                "water_match": water_ok,
                "rotation_caution": rotation,
                "score": score,
                "harvest_date": (planting + timedelta(days=crop["days"])).isoformat(),
                "observed_days": coverage,
                "buyer_count": len(buyers[key]),
                "observed_kg": round(totals[key], 1),
                "repeat_demand_14d_kg": repeat_14,
                "scenario_low_kg": round(repeat_14 * 0.75, 1) if repeat_14 is not None else None,
                "scenario_high_kg": round(repeat_14 * 1.25, 1) if repeat_14 is not None else None,
                "recommendation": "Explore with a local adviser"
                if seasonal and water_ok and not rotation
                else "Resolve growing constraints first",
            }
        )
    cards.sort(key=lambda c: (-c["score"], c["crop"]))
    return {
        "location": location,
        "planting_date": planting.isoformat(),
        "season": season,
        "water": water,
        "previous_crop": previous,
        "cards": cards,
        "sources": SOURCES,
        "data_label": "Synthetic restaurant consumption · not committed future orders",
        "method": "Season + irrigation + observed buyer usage, with a same-family rotation caution. Lead times and season buckets are demo assumptions. Demand repeats the last 28 calendar days into a 14-day harvest window; ±25% is a scenario range, not a statistical confidence interval.",
        "limitations": "No soil, weather, variety, local crop calendar or future buyer commitments are connected. Confirm timing and suitability with your local agricultural officer before planting. This planning shortlist is not a yield, profit or sale guarantee.",
    }
