import { ArrowUpRight, RefreshCw, TrendingUp } from "lucide-react";
import { useLocale } from "./Locale";
type Demand = {
  crop: string;
  requested_kg: number;
  available_kg: number;
  buyer_count: number;
  lot_ids: string[];
};
export default function DemandNow({
  data,
  busy,
  refresh,
  onExplore,
}: {
  data?: { as_of: string; records: Demand[] };
  busy: boolean;
  refresh: () => void;
  onExplore: (id: string) => void;
}) {
  const { tr } = useLocale();
  return (
    <section className="demand-now" aria-label={tr("Demand now")}>
      <div className="demand-heading">
        <div>
          <div className="eyebrow">
            <TrendingUp size={16} />
            {tr("BUYER REQUESTS ON HARVESTLINK")}
          </div>
          <h2>{tr("What buyers need now")}</h2>
        </div>
        <button className="button secondary" disabled={busy} onClick={refresh}>
          <RefreshCw size={16} />
          {tr("Refresh demand")}
        </button>
      </div>
      <p>
        {tr(
          "Approved purchase requests from demo buyers on this platform. These are not national market demand or forecast predictions. Quantities already covered by agreements are excluded.",
        )}
      </p>
      {data && (
        <small>
          {tr("Checked at")} {new Date(data.as_of).toLocaleString()}
        </small>
      )}
      <div className="demand-grid">
        {data?.records.map((row) => (
          <article className="demand-card" key={row.crop}>
            <span className="eyebrow">
              {tr(
                row.requested_kg > 0 ? "ACTIVE INTEREST" : "NO OPEN REQUESTS",
              )}
            </span>
            <h3>{tr(row.crop)}</h3>
            <strong className="demand-quantity">
              {row.requested_kg.toLocaleString()}{" "}
              <small>{tr("kg requested")}</small>
            </strong>
            <p>
              {row.buyer_count} {tr("interested buyers")} ·{" "}
              {row.available_kg.toLocaleString()}{" "}
              {tr("kg available in your harvest")}
            </p>
            {row.lot_ids.length > 0 ? (
              <button
                className="text-button"
                onClick={() => onExplore(row.lot_ids[0])}
              >
                {tr("Explore buyer offers")}
                <ArrowUpRight size={16} />
              </button>
            ) : (
              <small>
                {tr(
                  row.requested_kg > 0
                    ? "No matching harvest available to sell today."
                    : "Requests will appear when buyers approve a purchase need.",
                )}
              </small>
            )}
          </article>
        ))}
      </div>
      {!data?.records.length && (
        <p>{tr("List your harvest to start matching buyer requests.")}</p>
      )}
      <small>
        {tr(
          "Interest is not a guaranteed sale. Grade, quantity, distance and agent rules are checked during negotiation. You choose the final buyer.",
        )}
      </small>
    </section>
  );
}
