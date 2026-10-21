import { useEffect, useState } from "react";
import { Handshake, Play, ShieldCheck, Sprout, Store } from "lucide-react";
import { useLocale } from "./Locale";
type Row = Record<string, any>;
export function NegotiationReplay({
  offers,
  busy,
}: {
  offers: Row[];
  busy: boolean;
}) {
  const { tr } = useLocale();
  const [selected, setSelected] = useState("");
  const [visible, setVisible] = useState(0);
  const [playing, setPlaying] = useState(false);
  const offer = offers.find((o) => o.id === selected) || offers[0];
  const rounds: Row[] = offer?.rounds || [];
  useEffect(() => {
    setVisible(rounds.length);
    setPlaying(false);
  }, [offer?.id, rounds.length]);
  useEffect(() => {
    if (!playing) return;
    const timer = setInterval(
      () =>
        setVisible((v) => {
          if (v >= rounds.length) {
            setPlaying(false);
            return v;
          }
          return v + 1;
        }),
      1100,
    );
    return () => clearInterval(timer);
  }, [playing, rounds.length]);
  if (!offers.length && !busy) return null;
  const prices = rounds.map((r) => Number(r.price));
  const low = Math.min(...prices, 25) - 1,
    high = Math.max(...prices, 30) + 1;
  const xy = (r: Row, i: number) =>
    `${40 + i * (460 / Math.max(1, rounds.length - 1))},${150 - ((Number(r.price) - low) / (high - low)) * 110}`;
  return (
    <section
      className="panel negotiation-replay"
      aria-label={tr("Negotiation replay")}
    >
      <div className="panel-heading">
        <div>
          <div className="eyebrow">{tr("AGENTS AT THE TABLE")}</div>
          <h2>{tr("A better deal, together.")}</h2>
          <p>
            {tr(
              "Actual recorded offers. Replay explains the negotiation; you choose the buyer.",
            )}
          </p>
        </div>
        {offer && (
          <label>
            {tr("Buyer")}
            <select
              aria-label="Replay buyer"
              value={offer.id}
              onChange={(e) => setSelected(e.target.value)}
            >
              {offers.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.buyer_name}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
      {busy ? (
        <div className="agent-network" role="status">
          <Sprout />
          <span className="negotiating-link" />
          <Handshake />
          <span className="negotiating-link" />
          <Store />
          <p>{tr("Comparing terms within each owner’s limits…")}</p>
        </div>
      ) : (
        offer && (
          <div className="replay-grid">
            <div>
              <svg
                viewBox="0 0 550 190"
                role="img"
                aria-label={tr(
                  "Negotiation price chart in rupees per kilogram",
                )}
              >
                <path d="M40 20V155H520" fill="none" stroke="#d7dfd1" />
                <text x="40" y="18">
                  ₹ / kg
                </text>
                <polyline
                  fill="none"
                  stroke="#5c8251"
                  strokeWidth="3"
                  points={rounds.slice(0, visible).map(xy).join(" ")}
                />
                {rounds.slice(0, visible).map((r, i) => {
                  const [x, y] = xy(r, i).split(",").map(Number);
                  return (
                    <g key={i}>
                      <circle
                        cx={x}
                        cy={y}
                        r="5"
                        fill={
                          r.speaker === "Farmer agent" ? "#214932" : "#ad7c45"
                        }
                      />
                      <text x={x} y={y - 12} textAnchor="middle">
                        ₹{r.price}
                      </text>
                      <text x={x} y="180" textAnchor="middle">
                        {i + 1}
                      </text>
                    </g>
                  );
                })}
              </svg>
              <button
                className="button secondary"
                onClick={() => {
                  setVisible(0);
                  setPlaying(true);
                }}
                disabled={playing}
              >
                <Play size={16} />
                {tr("Replay negotiation")}
              </button>
              <p className="muted">
                {tr(
                  "Step number → · Recorded proposals, not a market-price forecast",
                )}
              </p>
            </div>
            <div className="trade-chat" aria-live="polite">
              {rounds.slice(0, visible).map((r, i) => (
                <article
                  key={i}
                  className={
                    r.speaker === "Farmer agent"
                      ? "seller-message"
                      : "buyer-message"
                  }
                >
                  <small>
                    {r.speaker} · {tr("Step")} {i + 1}
                  </small>
                  <strong>₹{r.price} / kg</strong>
                  <p>{tr(r.message)}</p>
                </article>
              ))}
              {visible === rounds.length && (
                <p className="replay-ready">
                  <ShieldCheck size={17} />
                  {tr("Offer ready. Farmer approval still required.")}
                </p>
              )}
            </div>
          </div>
        )
      )}
    </section>
  );
}
export function AgreementScene({ order }: { order: Row }) {
  const { tr } = useLocale();
  if (
    !["reserved", "funded", "picked_up", "received", "settled"].includes(
      order.status,
    )
  )
    return null;
  const funded = ["funded", "picked_up", "received", "settled"].includes(
    order.status,
  );
  return (
    <div
      className={`agreement-scene ${funded ? "secured" : ""}`}
      aria-label={tr("Mutual agreement")}
    >
      <div className="agreement-seal">
        <Handshake size={28} />
      </div>
      <div>
        <div className="eyebrow">{tr("BOTH PARTIES AGREED")}</div>
        <h3>{tr("A clear agreement. A shared next step.")}</h3>
        <p>
          {order.quantity} kg · ₹{order.price}/kg ·{" "}
          {tr("Stock reserved after buyer confirmation")}
        </p>
      </div>
      <div className="funds-path" aria-hidden="true">
        <span>₹</span>
        <span>→</span>
        <ShieldCheck />
      </div>
      <div className="escrow-vault">
        <strong>₹{Number(order.total).toLocaleString("en-IN")}</strong>
        <small>
          {tr(
            order.status === "settled"
              ? "Simulated funds released"
              : funded
                ? "Simulated funds locked"
                : "Awaiting simulated funding",
          )}
        </small>
      </div>
    </div>
  );
}
