import { useState, type FormEvent } from "react";
import { Sprout, CalendarDays, TrendingUp, ArrowRight } from "lucide-react";
import { useLocale } from "./Locale";
import ProduceArt from "./ProduceArt";
export default function CropPlanner({ location }: { location: string }) {
  const { tr } = useLocale();
  const [plan, setPlan] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const today = new Date().toLocaleDateString("en-CA");
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setPlan(null);
    const data = Object.fromEntries(new FormData(e.currentTarget));
    try {
      const r = await fetch("/api/crop-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const d = await r.json();
      if (!r.ok) throw Error(d.detail);
      setPlan(d);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="crop-planner">
      <div className="section-heading">
        <div>
          <div className="eyebrow">{tr("PLAN YOUR NEXT SEASON")}</div>
          <h2>{tr("What should I grow next?")}</h2>
          <p>
            {tr(
              "Match your next planting to the season and the kitchens around you.",
            )}
          </p>
        </div>
        <Sprout size={32} />
      </div>
      <form className="panel crop-plan-form" onSubmit={submit}>
        <label className="field">
          {tr("Farm location")}
          <input
            name="location"
            required
            minLength={2}
            maxLength={120}
            defaultValue={location}
          />
        </label>
        <label className="field">
          {tr("Planned planting date")}
          <input
            name="planting_date"
            type="date"
            required
            min={today}
            defaultValue={today}
          />
        </label>
        <label className="field">
          {tr("Water availability")}
          <select name="water">
            <option value="assured">{tr("Reliable irrigation")}</option>
            <option value="moderate">{tr("Moderate irrigation")}</option>
            <option value="limited">{tr("Limited water")}</option>
          </select>
        </label>
        <label className="field">
          {tr("Previous crop")}
          <select name="previous_crop">
            <option value="">{tr("Not selected")}</option>
            {["Tomato", "Okra", "Cucumber", "Brinjal", "Other"].map((c) => (
              <option key={c} value={c}>
                {tr(c)}
              </option>
            ))}
          </select>
        </label>
        <button className="button" disabled={busy}>
          <Sprout size={18} />
          {tr(busy ? "Preparing your shortlist…" : "Suggest crops")}
          <ArrowRight size={18} />
        </button>
      </form>
      {error && (
        <p role="alert" className="alert error">
          {tr(error)}
        </p>
      )}
      {!plan && (
        <div className="empty-forecast">
          <CalendarDays size={28} />
          <h3>{tr("A planting plan, with the reasons shown.")}</h3>
          <p>
            {tr(
              "Set your location, planting date and water availability. We compare broad seasonal options with recent restaurant usage. Harvest dates and demand are planning scenarios, not guaranteed sales.",
            )}
          </p>
        </div>
      )}
      {plan && (
        <>
          <div className="plan-summary" role="status">
            <div>
              <span className="eyebrow">{tr("YOUR SEASONAL SHORTLIST")}</span>
              <h3>
                {tr(plan.season)} · {plan.location}
              </h3>
              <p>
                {tr("For planting on")} {plan.planting_date}
              </p>
            </div>
            <span className="badge">{tr("Planning scenario · demo data")}</span>
          </div>
          <div className="crop-options">
            {plan.cards.map((c: any, i: number) => (
              <article className="panel crop-option" key={c.crop}>
                <div className="crop-option-title">
                  <span className="crop-number">0{i + 1}</span>
                  <div>
                    <h3>{tr(c.crop)}</h3>
                    <p>{tr(c.recommendation)}</p>
                  </div>
                </div>
                <div className="plan-produce">
                  <ProduceArt crop={c.crop} />
                </div>
                <div className="plan-reasons">
                  <p>
                    {c.season_match ? "✓" : "○"}{" "}
                    {tr(
                      c.season_match
                        ? "Broad seasonal match"
                        : "Outside the demo seasonal window",
                    )}
                  </p>
                  <p>
                    {c.water_match ? "✓" : "○"}{" "}
                    {tr(
                      c.water_match
                        ? "Water assumption matches"
                        : "Review water needs before choosing",
                    )}
                  </p>
                  {c.rotation_caution && (
                    <p>
                      {tr(
                        "Same crop family as your previous crop. Ask about rotation before planting.",
                      )}
                    </p>
                  )}
                </div>
                <div className="plan-harvest">
                  <CalendarDays size={18} />
                  <div>
                    <strong>
                      {tr("Illustrative first harvest")} · {c.harvest_date}
                    </strong>
                    <small>
                      {c.days} {tr("days after")} {tr(c.start)} ·{" "}
                      {tr("demo timing assumption")}
                    </small>
                  </div>
                </div>
                <div className="plan-demand">
                  <TrendingUp size={19} />
                  <div>
                    <strong>
                      {c.repeat_demand_14d_kg === null
                        ? tr("No observed demand evidence")
                        : `${c.scenario_low_kg}–${c.scenario_high_kg} kg`}
                    </strong>
                    <p>
                      {tr(
                        c.repeat_demand_14d_kg === null
                          ? "Seasonal option only. Talk to buyers before allocating land."
                          : "Possible 14-day usage around harvest, only if recent buying patterns repeat.",
                      )}
                    </p>
                    {c.repeat_demand_14d_kg !== null && (
                      <small>
                        {c.observed_kg} kg · {c.observed_days}{" "}
                        {tr("observed days")} · {c.buyer_count}{" "}
                        {tr("demo kitchens")}
                      </small>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
          <details className="panel planning-method">
            <summary>{tr("How these suggestions are calculated")}</summary>
            <p>{tr(plan.method)}</p>
            <p>{tr(plan.data_label)}</p>
            <p>{tr(plan.limitations)}</p>
            <div>
              {plan.sources.map((s: any) => (
                <a href={s.url} key={s.url} target="_blank" rel="noreferrer">
                  {tr(s.title)} ↗
                </a>
              ))}
            </div>
          </details>
          <p className="muted">
            {tr(
              "Check your soil, weather, crop variety and local sowing calendar with an agricultural officer before planting. Ask buyers to confirm demand for your expected harvest date.",
            )}
          </p>
        </>
      )}
    </section>
  );
}
