"""Isolated Chronos CPU inference. JSON in/out. No application credentials required."""

import json
import sys
from datetime import date, timedelta

import numpy as np
import pandas as pd
import torch
from chronos import Chronos2Pipeline

torch.set_num_threads(4)
rows = json.loads(sys.stdin.read())
df = pd.DataFrame(rows)
df["timestamp"] = pd.to_datetime(df["date"])
df = df.set_index("timestamp").asfreq("D")
df = df.reindex(pd.date_range(df.index.min(), date.today() - timedelta(days=1), freq="D"))
df.loc[df["stockout"].fillna(False).astype(bool), "quantity"] = float("nan")
# Missing / censored consumption stays missing; Chronos handles missing context.
values = df["quantity"].to_numpy(dtype=np.float32)
pipe = Chronos2Pipeline.from_pretrained("amazon/chronos-2", device_map="cpu")
quantiles, mean = pipe.predict_quantiles(
    [torch.tensor(values)], prediction_length=7, quantile_levels=[0.1, 0.5, 0.9]
)
q = quantiles[0].numpy().reshape(-1, 3)
forecast = np.maximum(q[:, 1], 0).tolist()
train = values[:-7]
actual = values[-7:]
back, _ = pipe.predict_quantiles([torch.tensor(train)], prediction_length=7, quantile_levels=[0.5])
pred = back[0].numpy().reshape(-1)
baseline = values[-14:-7]
mask = np.isfinite(actual) & np.isfinite(baseline)
evaluation = {
    "chronos_mae": round(float(np.abs(actual[mask] - pred[mask]).mean()), 3)
    if mask.any()
    else None,
    "seasonal_naive_mae": round(float(np.abs(actual[mask] - baseline[mask]).mean()), 3)
    if mask.any()
    else None,
    "held_out_days": int(mask.sum()),
    "note": "Single held-out week on synthetic demo data, not real-world validation.",
}
print(
    json.dumps(
        {
            "forecast": forecast,
            "intervals": np.maximum(q, 0).tolist(),
            "evaluation": evaluation,
        }
    )
)
