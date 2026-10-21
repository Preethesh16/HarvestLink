"""Generate synthetic CSV uploads and an explicit provenance manifest."""

import csv
import json
from pathlib import Path

from backend.domain import seed

out = Path("demo-data")
out.mkdir(exist_ok=True)
s = seed()


def write(name, fields, rows):
    with (out / name).open("w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fields, extrasaction="ignore", lineterminator="\n")
        writer.writeheader()
        writer.writerows(rows)


write(
    "farmer-harvest.csv",
    [
        "crop",
        "variety",
        "grade",
        "quantity",
        "unit",
        "ask_price",
        "harvest_date",
        "available_date",
    ],
    s["lots"],
)
for actor in ("r1", "r2", "r3"):
    write(
        f"{actor}-inventory.csv",
        ["crop", "quantity", "unit", "usable_until"],
        [r for r in s["inventory"] if r["actor"] == actor],
    )
    write(
        f"{actor}-consumption.csv",
        ["date", "crop", "quantity", "waste", "stockout"],
        [r for r in s["history"] if r["actor"] == actor],
    )
(out / "provenance.json").write_text(
    json.dumps(
        {
            "synthetic": True,
            "seed": 42,
            "participants": "All names and quantities fictional",
            "purpose": "Demo fixtures, not real agricultural or restaurant measurements",
            "generated_from": "backend.domain.seed",
        },
        indent=2,
    )
    + "\n"
)
