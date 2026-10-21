import { useEffect, useState } from "react";
import { ExternalLink, Search, RefreshCw } from "lucide-react";
import { useLocale } from "./Locale";
type Row = Record<string, any>;
export default function MarketPrices({ crops }: { crops: string[] }) {
  const { tr } = useLocale();
  const [report, setReport] = useState<Row | null>(null),
    [error, setError] = useState(""),
    [query, setQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [notice, setNotice] = useState("");
  async function refresh() {
    setRefreshing(true);
    setError("");
    setNotice("");
    try {
      const r = await fetch("/api/market/catalog/refresh", { method: "POST" });
      const d = await r.json();
      if (!r.ok)
        throw Error(
          d.detail || "Government refresh failed; saved prices retained.",
        );
      setReport(d);
      setNotice(
        d.refresh_result === "recent_cache"
          ? "Checked recently. Government requests are limited to once every 15 minutes."
          : "Government report fetched successfully. Check the publication date on each row.",
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setRefreshing(false);
    }
  }
  useEffect(() => {
    let active = true;
    fetch("/api/market/catalog")
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw Error(d.detail);
        if (active) {
          setReport(d);
          if (
            d.status !== "fetched_government_report" ||
            Date.now() - Date.parse(d.retrieved_at) > 900000
          )
            void refresh();
        }
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, []);
  const rows: Row[] = report?.records || [];
  const missing = crops.filter(
    (c) => !rows.some((r) => r.commodity.toLowerCase() === c.toLowerCase()),
  );
  const filtered = [...rows]
    .sort(
      (a, b) =>
        Number(b.group === "Vegetables") - Number(a.group === "Vegetables"),
    )
    .filter((r) => r.commodity.toLowerCase().includes(query.toLowerCase()));
  return (
    <section className="market-prices">
      <div className="section-heading">
        <div>
          <div className="eyebrow">{tr("OFFICIAL PRICE REFERENCE")}</div>
          <h1 className="page-title">
            {tr("Know the market before you sell.")}
          </h1>
          <p>
            {tr(
              "Government-published prices, with the reporting date and unit kept visible.",
            )}
          </p>
        </div>
        <a
          className="button secondary"
          href={report?.source_url || "https://agmarknet.gov.in/home"}
          target="_blank"
          rel="noreferrer"
        >
          {tr("View latest government report")}
          <ExternalLink size={16} />
        </a>
      </div>
      <div className="panel-heading">
        <button
          className="button secondary"
          disabled={refreshing}
          onClick={refresh}
        >
          <RefreshCw size={16} />
          {tr(
            refreshing
              ? "Fetching government prices…"
              : "Refresh government prices",
          )}
        </button>
        <small>
          {tr(
            "Refreshes on page visit when older than 15 minutes. Publication dates may lag behind today.",
          )}
        </small>
      </div>
      {notice && <p role="status">{tr(notice)}</p>}
      {error && (
        <p className="alert" role="alert">
          {tr(error)}
        </p>
      )}
      {!report && !error && (
        <p role="status">{tr("Loading price reference…")}</p>
      )}
      {report && (
        <>
          <section className="panel government-provenance">
            <strong>{report.source}</strong>
            <p>
              {tr("Reporting date")}: <b>{report.reporting_date}</b> ·{" "}
              {tr("Retrieved")}: {report.retrieved_at}
            </p>
            <p>{report.coverage}</p>
            <span className="badge amber">
              {tr(
                report.status === "fetched_government_report"
                  ? "Fetched government report · published prices"
                  : "Saved government snapshot · refresh not yet verified",
              )}
            </span>
            <p>
              {tr(
                "₹/kg is calculated only when the source unit is confirmed as quintal. Missing units are never guessed. Local market, grade and transport costs can differ.",
              )}
            </p>
          </section>
          <div className="panel">
            <label className="price-search">
              <Search size={18} />
              <input
                aria-label="Search government prices"
                placeholder={tr("Search crop prices")}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>
            <div className="table-scroll">
              <table className="government-table">
                <thead>
                  <tr>
                    <th>{tr("Commodity")}</th>
                    <th>{tr("Market / reporting date")}</th>
                    <th>{tr("Published price / source unit")}</th>
                    <th>{tr("Equivalent · ₹/kg")}</th>
                    <th>
                      {report.provider === "data_gov_api"
                        ? tr("Min / max · source unit")
                        : `${report.previous_reporting_date} · ₹/quintal`}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r, index) => (
                    <tr key={`${r.commodity}-${r.market}-${index}`}>
                      <td>
                        <strong>{r.commodity}</strong>
                        {r.variety && <small> · {r.variety}</small>}
                        {crops.some(
                          (c) => c.toLowerCase() === r.commodity.toLowerCase(),
                        ) && (
                          <span className="badge">{tr("In your harvest")}</span>
                        )}
                      </td>
                      <td>
                        {r.market || "All markets (national aggregate)"}
                        <br />
                        <small>
                          {r.reporting_date || report.reporting_date}
                        </small>
                      </td>
                      <td>
                        {r.reported_price == null && r.price_quintal == null
                          ? "—"
                          : Number(
                              r.reported_price ?? r.price_quintal,
                            ).toLocaleString("en-IN")}
                        <br />
                        <small>{r.source_unit || "INR per quintal"}</small>
                      </td>
                      <td>
                        {r.price_quintal === null
                          ? "—"
                          : (r.price_quintal / 100).toFixed(2)}
                      </td>
                      <td>
                        {report.provider === "data_gov_api"
                          ? `${r.min_price ?? "—"} / ${r.max_price ?? "—"}`
                          : r.previous_price_quintal == null
                            ? "—"
                            : Number(r.previous_price_quintal).toLocaleString(
                                "en-IN",
                              )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!filtered.length && (
              <p>
                {tr(
                  "No reported price for this crop in the captured government report.",
                )}
              </p>
            )}
          </div>
          {missing.length > 0 && (
            <p className="inline-note">
              {tr("No reported price in this snapshot for")}:{" "}
              {missing.join(", ")}.{" "}
              {tr(
                "An unavailable government price is never replaced with an invented quote.",
              )}
            </p>
          )}
        </>
      )}
    </section>
  );
}
