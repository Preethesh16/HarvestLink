import { useEffect, useState } from "react";
import { ExternalLink, Search } from "lucide-react";
import { useLocale } from "./Locale";
type Row = Record<string, any>;
export default function MarketPrices({ crops }: { crops: string[] }) {
  const { tr } = useLocale();
  const [report, setReport] = useState<Row | null>(null),
    [error, setError] = useState(""),
    [query, setQuery] = useState("");
  useEffect(() => {
    let active = true;
    fetch("/api/market/catalog")
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw Error(d.detail);
        if (active) setReport(d);
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
          href="https://agmarknet.gov.in/home"
          target="_blank"
          rel="noreferrer"
        >
          {tr("View latest government report")}
          <ExternalLink size={16} />
        </a>
      </div>
      {error && <p role="alert">{error}</p>}
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
              {tr("Dated government snapshot · not a live quote")}
            </span>
            <p>
              {tr(
                "Original prices are ₹ per quintal. The ₹/kg column divides by 100. Local market, grade and transport costs can differ.",
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
                    <th>{tr("Government price · ₹/quintal")}</th>
                    <th>{tr("Equivalent · ₹/kg")}</th>
                    <th>{report.previous_reporting_date} · ₹/quintal</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => (
                    <tr key={r.commodity}>
                      <td>
                        <strong>{r.commodity}</strong>
                        {crops.some(
                          (c) => c.toLowerCase() === r.commodity.toLowerCase(),
                        ) && (
                          <span className="badge">{tr("In your harvest")}</span>
                        )}
                      </td>
                      <td>
                        {r.price_quintal === null
                          ? "—"
                          : Number(r.price_quintal).toLocaleString("en-IN")}
                      </td>
                      <td>
                        {r.price_quintal === null
                          ? "—"
                          : (r.price_quintal / 100).toFixed(2)}
                      </td>
                      <td>
                        {r.previous_price_quintal === null
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
