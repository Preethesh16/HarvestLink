import { useEffect, useState, useRef } from "react";
import type { FormEvent, ReactNode } from "react";
import {
  ArrowDownToLine,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Check,
  CheckCircle2,
  Clock3,
  Leaf,
  LayoutDashboard,
  MapPin,
  Handshake,
  ShoppingCart,
  Package,
  Plus,
  RefreshCw,
  Settings2,
  ShieldCheck,
  Sparkles,
  Sprout,
  Store,
  Truck,
  Upload,
  X,
} from "lucide-react";
import { useLocale } from "./Locale";
import Assistant from "./Assistant";
import CropPlanner from "./CropPlanner";
import MarketPrices from "./MarketPrices";
import DeliveryMap from "./DeliveryMap";
import { NegotiationReplay, AgreementScene } from "./TradeJourney";
import ProduceArt from "./ProduceArt";
type Row = Record<string, any>;
type State = {
  actor: string;
  profiles: Row[] | Record<string, Row>;
  lots: Row[];
  inventory: Row[];
  history: Row[];
  forecasts: Row[] | Row;
  requirements: Row[];
  offers: Row[];
  orders: Row[];
  events: Row[];
  policy: Row;
  market: Row | Row[];
  mode: Row | string;
};
const names: Record<string, string> = {
  farmer: "Farmer workspace",
  r1: "Restaurant A",
  r2: "Restaurant B",
  r3: "Restaurant C",
};
const money = (n: any) =>
  `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
const pretty = (s: any) => String(s || "").replaceAll("_", " ");
function Badge({
  children,
  tone = "green",
}: {
  children: ReactNode;
  tone?: string;
}) {
  const { tr } = useLocale();
  return (
    <span className={`badge ${tone}`}>
      {typeof children === "string" ? tr(children) : children}
    </span>
  );
}
function Empty({ children }: { children: ReactNode }) {
  const { tr } = useLocale();
  return (
    <div className="empty">
      <Package size={28} />
      <p>{typeof children === "string" ? tr(children) : children}</p>
    </div>
  );
}
function Field({
  label,
  name,
  value,
  type = "text",
  required = true,
}: {
  label: string;
  name: string;
  value?: any;
  type?: string;
  required?: boolean;
}) {
  const { tr } = useLocale();
  return (
    <label className="field">
      {tr(label)}
      <input
        name={name}
        type={type}
        defaultValue={value}
        required={required}
        min={type === "number" ? 0 : undefined}
        step={type === "number" ? "any" : undefined}
      />
    </label>
  );
}
export default function App({ initialActor }: { initialActor: string }) {
  const { tr } = useLocale();
  const [actor, setActor] = useState(initialActor);
  const [page, setPage] = useState("Overview");
  const [state, setState] = useState<State | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [modal, setModal] = useState("");
  const [importKind, setImportKind] = useState("harvest");
  const [csv, setCsv] = useState("");
  const [sheet, setSheet] = useState<Row | null>(null);
  const [replaceImport, setReplaceImport] = useState(false);
  const [requestLot, setRequestLot] = useState<Row | null>(null);
  const [negotiationLot, setNegotiationLot] = useState("");
  const [busyText, setBusyText] = useState("");
  const actorRef = useRef(actor);
  actorRef.current = actor;
  const loadVersion = useRef(0);
  const modalRef = useRef<HTMLElement>(null);
  const busyRef = useRef(busy);
  busyRef.current = busy;
  const farmer = actor === "farmer";
  async function load(role = actor) {
    const version = ++loadVersion.current;
    try {
      const r = await fetch("/api/state", { headers: { "X-Actor": role } });
      if (!r.ok)
        throw new Error(
          "Cannot connect to your workspace. Check the local API and try again.",
        );
      const d = await r.json();
      if (actorRef.current !== role || version !== loadVersion.current) return;
      setState(d);
      setError("");
    } catch (e) {
      if (actorRef.current === role && version === loadVersion.current)
        setError((e as Error).message);
    }
  }
  useEffect(() => {
    setState(null);
    setNegotiationLot("");
    load();
    localStorage.setItem("harvest-role", actor);
  }, [actor]);
  useEffect(() => {
    if (!modal) return;
    const previous = document.activeElement as HTMLElement | null;
    const dialog = modalRef.current;
    if (!dialog) return;
    const selector =
      'button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex="0"]';
    const initial = dialog.querySelector<HTMLElement>(selector);
    initial?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busyRef.current) {
        event.preventDefault();
        setModal("");
        return;
      }
      if (event.key !== "Tab") return;
      const items = Array.from(
        dialog.querySelectorAll<HTMLElement>(selector),
      ).filter((el) => el.getClientRects().length > 0);
      if (!items.length) {
        event.preventDefault();
        dialog.focus();
        return;
      }
      const first = items[0],
        last = items[items.length - 1];
      if (
        event.shiftKey &&
        (document.activeElement === first ||
          !dialog.contains(document.activeElement))
      ) {
        event.preventDefault();
        last.focus();
      } else if (
        !event.shiftKey &&
        (document.activeElement === last ||
          !dialog.contains(document.activeElement))
      ) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      if (previous?.isConnected) previous.focus();
    };
  }, [modal]);
  async function action(
    path: string,
    body: Row = {},
    success = "Saved successfully",
  ) {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusyText(
      path === "/forecast"
        ? "Forecasting consumption and usable inventory…"
        : path === "/negotiate"
          ? "Comparing buyer requirements and negotiating within limits…"
          : path === "/market/refresh"
            ? "Checking the market reference source…"
            : "Saving your changes…",
    );
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api" + path, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Actor": actor },
        body: JSON.stringify(body),
      });
      const d = await r.json();
      if (!r.ok)
        throw new Error(
          typeof d.detail === "string"
            ? d.detail
            : JSON.stringify(d.detail || "This action could not be completed."),
        );
      await load();
      setNotice(success);
      setModal("");
      return d;
    } catch (e) {
      setError((e as Error).message);
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }
  function submit(e: FormEvent<HTMLFormElement>, path: string) {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.currentTarget));
    for (const k of [
      "quantity",
      "ask_price",
      "min_price",
      "max_price",
      "max_budget",
      "radius_km",
    ])
      if (data[k] !== undefined) data[k] = Number(data[k]) as any;
    action(path, data);
  }
  const profiles = state
    ? Array.isArray(state.profiles)
      ? state.profiles
      : Object.values(state.profiles || {})
    : [];
  const profile = profiles.find((p) => (p.id || p.actor) === actor) || {};
  const lots = state?.lots || [];
  const offers = (state?.offers || []).filter(
    (o) =>
      o.status === "active" &&
      (!o.expires_at || new Date(o.expires_at).getTime() > Date.now()),
  );
  const selectedLotId = lots.some((l) => l.id === negotiationLot)
    ? negotiationLot
    : lots[0]?.id;
  const selectedOffers = offers.filter((o) => o.lot_id === selectedLotId);
  const orders = state?.orders || [];
  const policy = state?.policy || {};

  const fs = state?.forecasts;
  const forecast: Row = Array.isArray(fs)
    ? fs.find((f) => !f.actor || f.actor === actor) || fs[0] || {}
    : fs?.[actor] || fs || {};
  const hasForecast = [
    forecast.daily,
    forecast.predictions,
    forecast.forecast,
    forecast.points,
  ].some((rows) => Array.isArray(rows) && rows.length > 0);
  const inventory = state?.inventory || [];
  const available = lots.reduce(
    (s, l) =>
      s +
      Number(
        l.available_quantity ??
          l.available ??
          Number(l.quantity || 0) -
            Number(l.reserved || 0) -
            Number(l.sold || 0),
      ),
    0,
  );
  const buyerName = (id: string) =>
    profiles.find((p) => (p.id || p.actor) === id)?.name || names[id] || id;
  const suggestion = Number(
    forecast.recommended_quantity ??
      forecast.reorder_quantity ??
      forecast.suggested_quantity ??
      forecast.purchase_quantity ??
      0,
  );
  const tabs = farmer
    ? [
        "Overview",
        "My harvest",
        "What to grow next",
        "Mandi prices",
        "Negotiations",
        "Orders",
        "Agent settings",
      ]
    : [
        "Overview",
        "Inventory & forecast",
        "Marketplace",
        "Negotiations",
        "Orders",
        "Agent settings",
      ];
  const icons: Record<string, typeof Sprout> = {
    Overview: LayoutDashboard,
    "My harvest": Sprout,
    "What to grow next": Sprout,
    "Mandi prices": BarChart3,
    "Inventory & forecast": Package,
    Marketplace: ShoppingCart,
    Negotiations: Handshake,
    Orders: Truck,
    "Agent settings": Settings2,
  };
  function renderLotCard({ lot }: { lot: Row }) {
    return (
      <article className="lot-card" key={lot.id}>
        <div className="produce-art">
          <ProduceArt crop={lot.crop} />
          <Badge>{lot.grade || "Grade A"}</Badge>
        </div>
        <div className="lot-details">
          <div className="eyebrow">{tr("FRESH FROM THE FARM")}</div>
          <h3>
            {tr(lot.crop)}
            <span>{lot.variety || "Local harvest"}</span>
          </h3>
          <div className="lot-facts">
            <span>
              <Package size={14} />
              {lot.available_quantity ??
                lot.available ??
                lot.quantity -
                  Number(lot.reserved || 0) -
                  Number(lot.sold || 0)}{" "}
              {tr("kg available")}
            </span>
            <span>
              <MapPin size={14} />
              {lot.location ||
                profiles.find((p) => p.id === "farmer")?.location ||
                "Farm location"}
            </span>
          </div>
          <div className="lot-footer">
            <div>
              <strong>{money(lot.ask_price)}</strong>
              <small>{tr("/ kg asking price")}</small>
            </div>
            <button
              className="text-button"
              disabled={
                busy ||
                Number(
                  lot.available_quantity ??
                    lot.available ??
                    lot.quantity -
                      Number(lot.reserved || 0) -
                      Number(lot.sold || 0),
                ) <= 0
              }
              onClick={() =>
                farmer
                  ? (setNegotiationLot(lot.id),
                    setPage("Negotiations"),
                    action(
                      "/negotiate",
                      { lot_id: lot.id },
                      "Negotiation round complete. You choose the buyer.",
                    ))
                  : (setRequestLot(lot), setModal("request"))
              }
            >
              {tr(farmer ? "Find offers" : "Request produce")}
              <ArrowUpRight size={16} />
            </button>
          </div>
        </div>
      </article>
    );
  }
  function renderOffers() {
    return (
      <>
        <div className="section-heading">
          <div>
            <h2>
              {tr(
                farmer ? "Your harvest. Your decision." : "Your agent’s offers",
              )}
            </h2>
            <p>
              {tr(
                typeof state?.mode === "object" &&
                  state.mode.negotiation === "openai"
                  ? "AI-assisted, server-validated offers"
                  : "Local rule-based demonstration",
              )}{" "}
              {tr(
                "· Buyer collection · Final selection stays with the farmer.",
              )}
            </p>
          </div>
          <div className="negotiation-controls">
            <select
              aria-label={tr("Harvest to negotiate")}
              value={selectedLotId || ""}
              disabled={busy}
              onChange={(e) => setNegotiationLot(e.target.value)}
            >
              {lots.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.crop}
                  {" · "}
                  {l.variety}
                  {" · "}
                  {l.quantity} {tr("kg")}
                </option>
              ))}
            </select>
            <button
              className="button"
              disabled={busy || !selectedLotId}
              onClick={() =>
                action(
                  "/negotiate",
                  { lot_id: selectedLotId },
                  "Negotiation round complete",
                )
              }
            >
              <Sparkles size={16} />
              {tr("Run negotiation")}
            </button>
          </div>
        </div>
        {!selectedOffers.length ? (
          <Empty>
            {tr(
              "No offers yet. Create a buyer requirement, then run a negotiation.",
            )}
          </Empty>
        ) : (
          <div className="offers-grid">
            {selectedOffers.map((o, i) => (
              <article className="offer-card" key={o.id}>
                <div className="offer-top">
                  <span className="restaurant-icon">
                    <Store size={22} />
                  </span>
                  <Badge tone={i === 0 ? "green" : "neutral"}>
                    {pretty(o.status || "Provisional offer")}
                  </Badge>
                </div>
                <h3>{buyerName(o.buyer_id || o.buyer || o.actor)}</h3>
                <p>
                  {o.quantity}
                  {tr("kg ·")}{" "}
                  {o.crop ||
                    lots.find((l) => l.id === o.lot_id)?.crop ||
                    "Produce"}
                </p>
                <div className="offer-price">
                  {money(o.price ?? o.unit_price)}
                  <span>{tr("/ kg")}</span>
                </div>
                <div className="offer-line">
                  <span>{tr("Gross return")}</span>
                  <strong>
                    {money(
                      o.total ??
                        o.gross_amount ??
                        o.quantity * (o.price ?? o.unit_price),
                    )}
                  </strong>
                </div>
                <div className="offer-line">
                  <span>{tr("Collection")}</span>
                  <strong>{tr("Buyer collects")}</strong>
                </div>
                <div className="offer-line">
                  <span>{tr("Nearby distance (demo)")}</span>
                  <strong>
                    {o.distance_km ?? "—"}
                    {tr("km")}
                  </strong>
                </div>
                <div className="offer-line">
                  <span>{tr("Transport deduction")}</span>
                  <strong>{tr("₹0")}</strong>
                </div>
                {o.reason && <p className="offer-reason">{o.reason}</p>}
                {o.rounds?.length > 0 && (
                  <details className="rounds">
                    <summary>
                      {o.rounds.length}
                      {tr("negotiation steps · inspect")}
                    </summary>
                    {o.rounds.map((r: Row, j: number) => (
                      <p key={j}>
                        <strong>{pretty(r.speaker)}</strong>
                        {" · "}
                        {money(r.price)}
                        <br />
                        {r.message}
                      </p>
                    ))}
                  </details>
                )}
                {farmer ? (
                  <button
                    className="button full"
                    disabled={
                      busy ||
                      o.status !== "active" ||
                      (!!o.expires_at &&
                        new Date(o.expires_at).getTime() < Date.now())
                    }
                    onClick={() =>
                      action(
                        `/offers/${o.id}/select`,
                        {},
                        "Buyer selected. Switch to their workspace to confirm.",
                      )
                    }
                  >
                    {tr("Choose this offer")}
                    <ArrowRight size={16} />
                  </button>
                ) : (
                  <div className="inline-note">
                    <Clock3 size={15} />
                    {tr("Awaiting the farmer’s decision")}
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
        {!farmer && (
          <section className="panel requirements">
            <h3>{tr("Your approved purchase requests")}</h3>
            {state?.requirements?.map((r: Row) => (
              <p key={r.id}>
                {r.quantity}
                {tr("kg ·")}
                {r.crop || "Tomato"}
                {" · "} {pretty(r.status || "approved")}
              </p>
            ))}
          </section>
        )}
        <NegotiationReplay offers={offers} busy={busy} />
        {renderActivity()}
      </>
    );
  }
  function renderActivity() {
    return (
      <section className="panel activity">
        <div className="panel-heading">
          <h3>{tr("Negotiation journal")}</h3>
          <Badge tone="neutral">{tr("Actual system events")}</Badge>
        </div>
        {(state?.events || [])
          .slice(-8)
          .reverse()
          .map((e, i) => (
            <div className="event" key={e.id || i}>
              <span className="event-dot" />
              <div>
                <strong>
                  {pretty(e.type || e.action || e.event || e.kind)}
                </strong>
                <p>
                  {e.message ||
                    e.description ||
                    e.detail ||
                    (typeof e.data === "string"
                      ? e.data
                      : JSON.stringify(e.data || {}))}
                </p>
              </div>
              <small>
                {String(e.created_at || e.timestamp || e.time || "").slice(
                  11,
                  16,
                )}
              </small>
            </div>
          ))}
        {!state?.events?.length && (
          <p className="muted">
            {tr("Your trading activity will appear here.")}
          </p>
        )}
      </section>
    );
  }
  function renderOrders() {
    return (
      <>
        <div className="section-heading">
          <div>
            <h2>{tr("From agreement to arrival.")}</h2>
            <p>{tr("Every payment below is a simulation. No money moves.")}</p>
          </div>
          <Badge tone="amber">{tr("Demo payment protection")}</Badge>
        </div>
        {!orders.length ? (
          <Empty>{tr("Selected offers become orders here.")}</Empty>
        ) : (
          orders.map((o) => (
            <section className="panel order" key={o.id}>
              <div className="panel-heading">
                <div>
                  <div className="eyebrow">
                    {buyerName(o.buyer_id || o.buyer)}
                  </div>
                  <h3>
                    {o.quantity} {tr("kg")}
                    {o.crop || "Tomatoes"}
                  </h3>
                </div>
                <Badge>{pretty(o.status)}</Badge>
              </div>
              <div className="order-amount">
                <span>{tr("Agreement total")}</span>
                <strong>
                  {money(
                    o.total ??
                      o.amount ??
                      o.quantity * (o.price ?? o.unit_price),
                  )}
                </strong>
              </div>
              <AgreementScene order={o} />
              <div className="order-steps">
                {[
                  "awaiting_buyer",
                  "reserved",
                  "funded",
                  "picked_up",
                  "received",
                  "settled",
                ].map((s, i) => (
                  <div
                    key={s}
                    className={
                      [
                        "awaiting_buyer",
                        "reserved",
                        "funded",
                        "picked_up",
                        "received",
                        "settled",
                      ].indexOf(o.status) >= i
                        ? "done"
                        : ""
                    }
                  >
                    <span>{i + 1}</span>
                    {pretty(s)}
                  </div>
                ))}
              </div>
              <DeliveryMap
                buyer={o.buyer_id || o.buyer}
                buyerName={buyerName(o.buyer_id || o.buyer)}
                status={o.status}
              />
              <div className="actions">
                {!farmer &&
                  [
                    "selected",
                    "pending_confirmation",
                    "awaiting_confirmation",
                    "awaiting_buyer",
                  ].includes(o.status) && (
                    <button
                      className="button"
                      disabled={busy}
                      onClick={() =>
                        action(
                          `/orders/${o.id}/confirm`,
                          {},
                          "Agreement confirmed and stock reserved",
                        )
                      }
                    >
                      {tr("Confirm agreement")}
                    </button>
                  )}
                {!farmer && ["confirmed", "reserved"].includes(o.status) && (
                  <button
                    className="button"
                    disabled={busy}
                    onClick={() =>
                      action(
                        `/orders/${o.id}/fund`,
                        {},
                        "Simulated payment funded",
                      )
                    }
                  >
                    {tr("Fund simulated payment")}
                  </button>
                )}
                {farmer && o.status === "funded" && (
                  <button
                    className="button"
                    disabled={busy}
                    onClick={() =>
                      action(`/orders/${o.id}/pickup`, {}, "Pickup recorded")
                    }
                  >
                    {tr("Record pickup")}
                  </button>
                )}
                {!farmer && ["picked_up", "in_transit"].includes(o.status) && (
                  <button
                    className="button"
                    disabled={busy}
                    onClick={() =>
                      action(`/orders/${o.id}/receive`, {}, "Delivery received")
                    }
                  >
                    {tr("Confirm receipt")}
                  </button>
                )}
                {farmer && o.status === "received" && (
                  <button
                    className="button"
                    disabled={busy}
                    onClick={() =>
                      action(
                        `/orders/${o.id}/release`,
                        {},
                        "Simulated settlement complete",
                      )
                    }
                  >
                    {tr("Release simulated funds")}
                  </button>
                )}
                {[
                  "selected",
                  "confirmed",
                  "reserved",
                  "pending_confirmation",
                  "awaiting_buyer",
                ].includes(o.status) && (
                  <button
                    className="button secondary"
                    disabled={busy}
                    onClick={() =>
                      action(`/orders/${o.id}/cancel`, {}, "Order cancelled")
                    }
                  >
                    {tr("Cancel order")}
                  </button>
                )}
              </div>
            </section>
          ))
        )}
      </>
    );
  }
  function renderForecast() {
    const raw =
      forecast.daily ||
      forecast.predictions ||
      forecast.forecast ||
      forecast.points ||
      [];
    const values = (Array.isArray(raw) ? raw : []).slice(0, 7);
    return (
      <>
        <div className="section-heading">
          <div>
            <h2>{tr("Buy what your kitchen needs.")}</h2>
            <p>
              {tr(
                "Consumption forecasts meet usable stock and estimated shelf life.",
              )}
            </p>
          </div>
          <button
            className="button"
            disabled={busy}
            onClick={() => action("/forecast", {}, "Forecast refreshed")}
          >
            <BarChart3 size={16} />
            {tr("Run forecast")}
          </button>
        </div>
        {!hasForecast && (
          <div className="empty-forecast" role="status">
            <BarChart3 size={24} />
            <h3>{tr("Run a forecast to plan your purchase.")}</h3>
            <p>
              {tr(
                "We have not calculated demand for this inventory yet. Add consumption history, then run the forecast. You can still create a manual request from Marketplace.",
              )}
            </p>
          </div>
        )}
        {hasForecast && (
          <div className="forecast-grid">
            <section className="panel forecast">
              <div className="panel-heading">
                <h3>{tr("Seven-day consumption outlook")}</h3>
                <Badge tone="neutral">
                  {pretty(forecast.model || forecast.method || "Baseline demo")}
                </Badge>
              </div>
              <div className="chart">
                {(values.length
                  ? values
                  : Array.from({ length: 7 }, (_, i) => ({
                      value: 0,
                      date: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][
                        i
                      ],
                    }))
                ).map((v: any, i: number) => {
                  const n = Number(
                    typeof v === "number"
                      ? v
                      : (v.consumption ??
                          v.predicted ??
                          v.prediction ??
                          v.value ??
                          v.mean ??
                          v.demand ??
                          0),
                  );
                  return (
                    <div className="bar-column" key={i}>
                      <span>{n.toFixed(1)}</span>
                      <div
                        className="bar"
                        style={{
                          height: `${Math.max(3, Math.min(145, n * 6))}px`,
                        }}
                      />
                      <small>
                        {typeof v === "object"
                          ? String(v.date || v.day || `Day ${i + 1}`).slice(-5)
                          : `D${i + 1}`}
                      </small>
                    </div>
                  );
                })}
              </div>
              <p className="caption">
                {forecast.assumptions ||
                  "Projected consumption in kg · Synthetic demo history. Shelf-life estimates are not safety guarantees."}
              </p>
            </section>
            <section className="reorder-card">
              <span className="circle-icon">
                <Package size={22} />
              </span>
              <div className="eyebrow">{tr("SUGGESTED REPLENISHMENT")}</div>
              <h2>
                {suggestion}
                <span> {tr("kg")}</span>
              </h2>
              <p>
                {tr("Projected shortage:")}{" "}
                <strong>
                  {forecast.shortage_date || "No shortage projected"}
                </strong>
                <br />
                {tr("Order by:")}{" "}
                <strong>{forecast.order_by || "Review forecast"}</strong>
                <br />
                {tr("Expected unusable stock:")}{" "}
                <strong>
                  {forecast.expected_waste ?? 0} {tr("kg")}
                </strong>
              </p>
              <button
                className="button light"
                disabled={
                  busy || !lots.length || !hasForecast || suggestion <= 0
                }
                onClick={() =>
                  action(
                    "/requirements",
                    { lot_id: lots[0]?.id, quantity: suggestion },
                    "Purchase requirement approved",
                  )
                }
              >
                {tr("Create purchase request")}
                <ArrowRight size={16} />
              </button>
            </section>
          </div>
        )}
        {forecast.evaluation && (
          <section className="panel">
            <h3>{tr("Forecast evaluation")}</h3>
            <p className="muted">
              {tr("Held-out synthetic history · Chronos MAE:")}{" "}
              {forecast.evaluation.chronos_mae}
              {tr("kg · Baseline MAE:")}{" "}
              {forecast.evaluation.seasonal_naive_mae ??
                forecast.evaluation.baseline_mae}{" "}
              {tr(
                "kg. Lower is better. Synthetic results do not establish real-world accuracy.",
              )}
            </p>
            {forecast.intervals && (
              <details className="forecast-details">
                <summary>
                  {tr("Inspect model uncertainty · 10th–90th percentile")}
                </summary>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>{tr("Day")}</th>
                        <th>{tr("Lower")}</th>
                        <th>{tr("Median")}</th>
                        <th>{tr("Upper")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {forecast.intervals.map((q: number[], i: number) => (
                        <tr key={i}>
                          <td>
                            {tr("Day")}
                            {i + 1}
                          </td>
                          <td>
                            {Number(q[0]).toFixed(1)} {tr("kg")}
                          </td>
                          <td>
                            {Number(q[1]).toFixed(1)} {tr("kg")}
                          </td>
                          <td>
                            {Number(q[2]).toFixed(1)} {tr("kg")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="caption">
                  {tr(
                    "Quantile estimates reflect model uncertainty, not a guaranteed stock level.",
                  )}
                </p>
              </details>
            )}
          </section>
        )}
        <section className="panel">
          <div className="panel-heading">
            <h3>{tr("Inventory batches")}</h3>
            <button
              className="text-button"
              onClick={() => {
                setImportKind("inventory");
                setSheet(null);
                setCsv("");
                setModal("import");
              }}
            >
              <Upload size={15} />
              {tr("Import Excel / CSV")}
            </button>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{tr("Ingredient")}</th>
                  <th>{tr("Available")}</th>
                  <th>{tr("Usable until")}</th>
                  <th>{tr("Batch")}</th>
                </tr>
              </thead>
              <tbody>
                {inventory.map((b, i) => (
                  <tr key={b.id || i}>
                    <td>
                      <span className="crop-dot" />
                      {b.crop || b.ingredient}
                    </td>
                    <td>
                      {b.quantity} {tr("kg")}
                    </td>
                    <td>
                      {b.usable_until || b.expiry_date || b.expires_at || "—"}
                    </td>
                    <td>{b.batch_id || b.id}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!inventory.length && (
            <Empty>{tr("Import inventory to begin.")}</Empty>
          )}
          <div className="panel-bottom">
            <button
              className="text-button"
              onClick={() => {
                setImportKind("consumption");
                setSheet(null);
                setCsv("");
                setModal("import");
              }}
            >
              {tr("Upload consumption history")}
              <ArrowUpRight size={16} />
            </button>
            <a href="/api/templates/consumption.csv" download>
              {tr("Download history template")}
            </a>
          </div>
        </section>
      </>
    );
  }
  return (
    <div
      className={`app ${farmer ? "farmer-workspace" : "restaurant-workspace"}`}
    >
      <aside className="sidebar">
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            setPage("Overview");
          }}
        >
          <span className="brand-icon">
            <Sprout size={25} />
          </span>
          {tr("harvestlink")}
          <span className="brand-period">{tr(".")}</span>
        </a>
        <div className="workspace-label">{tr("YOUR WORKSPACE")}</div>
        <div className="role-select">
          <span className="role-icon">
            {farmer ? <Sprout size={20} /> : <Store size={20} />}
          </span>
          <strong>{tr(names[actor])}</strong>
        </div>
        <nav>
          {tabs.map((t) => {
            const Icon = icons[t];
            return (
              <button
                key={t}
                onClick={() => setPage(t)}
                className={page === t ? "active" : ""}
              >
                <Icon size={18} />
                {tr(t)}
                {t === "Negotiations" && offers.length > 0 && (
                  <span className="nav-count">{offers.length}</span>
                )}
              </button>
            );
          })}
        </nav>
        <div className="sidebar-note">
          <span className="pulse" />
          <strong>{tr("Human choice. Agent assistance.")}</strong>
          <p>
            {tr(
              "Your agent negotiates within your limits. You make the final decision.",
            )}
          </p>
        </div>
        <div className="sidebar-bottom">
          <div className="avatar">
            {String(profile.name || names[actor])
              .split(" ")
              .slice(0, 2)
              .map((n: string) => n[0])
              .join("")}
          </div>
          <div>
            <strong>{profile.name || names[actor]}</strong>
            <small>
              {tr(farmer ? "Grower" : "Buyer")}
              {" · "} {profile.location || "Local workspace"}
            </small>
          </div>
          <button
            aria-label={tr("Edit profile")}
            onClick={() => setModal("profile")}
          >
            <Settings2 size={17} />
          </button>
        </div>
      </aside>
      <main>
        <header className="topbar">
          <div>
            <span className="breadcrumb">{tr("Workspace")}</span>
            <span className="slash">{tr("/")}</span>
            {tr(page)}
          </div>
          <div className="topbar-right">
            <span className="demo-label">
              <span />
              {tr("Interactive demo")}
            </span>
            <button
              className="icon-button"
              aria-label={tr("Refresh workspace")}
              onClick={() => load()}
            >
              <RefreshCw size={17} />
            </button>
            {farmer && (
              <button
                className="button small secondary"
                onClick={() => setModal("reset")}
              >
                {tr("Reset demo")}
              </button>
            )}
          </div>
        </header>
        <div className="content">
          {busy && !modal && (
            <div className="alert busy" role="status">
              <RefreshCw size={16} />
              {tr(busyText)}
            </div>
          )}
          {error && (
            <div className="alert error" role="alert">
              {tr(error)}
              <button
                aria-label={tr("Dismiss error")}
                onClick={() => setError("")}
              >
                <X size={16} />
              </button>
            </div>
          )}
          {notice && (
            <div className="alert success" role="status">
              <CheckCircle2 size={18} />
              {tr(notice)}
              <button
                aria-label={tr("Dismiss notification")}
                onClick={() => setNotice("")}
              >
                <X size={16} />
              </button>
            </div>
          )}
          {!state ? (
            <div className="loading">
              <Package size={36} />
              <h2>{tr("Opening your workspace…")}</h2>
              <button className="button secondary" onClick={() => load()}>
                {tr("Try connection again")}
              </button>
            </div>
          ) : (
            <>
              {farmer && page === "Mandi prices" && (
                <MarketPrices
                  crops={[...new Set(lots.map((l) => String(l.crop)))]}
                />
              )}
              {farmer && page === "What to grow next" && (
                <CropPlanner
                  location={profile.location || "Bantwal, Karnataka"}
                />
              )}
              {page === "Overview" && (
                <>
                  <section className="hero">
                    <div className="hero-copy">
                      <div className="eyebrow">
                        <span className="tiny-line" />
                        {tr(
                          farmer
                            ? "GROW TOGETHER. TRADE BETTER."
                            : "PLAN. PURCHASE. RECEIVE.",
                        )}
                      </div>
                      <h1>
                        {farmer ? (
                          <>
                            {tr("A better harvest.")}
                            <br />
                            <em>{tr("A better deal.")}</em>
                          </>
                        ) : (
                          <>
                            {tr("A well-stocked kitchen.")}
                            <br />
                            <em>{tr("Less left to chance.")}</em>
                          </>
                        )}
                      </h1>
                      <p>
                        {tr(
                          farmer
                            ? "Connect your harvest to nearby kitchens. Let your agent find the offers. Keep the final choice."
                            : "Turn tomorrow’s needs into today’s purchase decisions. Source directly from local growers.",
                        )}
                      </p>
                      <div className="actions">
                        <button
                          className="button"
                          onClick={() =>
                            farmer
                              ? setModal("lot")
                              : setPage("Inventory & forecast")
                          }
                        >
                          {farmer ? (
                            <Plus size={17} />
                          ) : (
                            <BarChart3 size={17} />
                          )}
                          {tr(farmer ? "List a harvest" : "Plan my purchases")}
                          <ArrowRight size={17} />
                        </button>
                        <button
                          className="text-button"
                          onClick={() => setPage("Negotiations")}
                        >
                          {tr("View negotiations")}
                          <ArrowUpRight size={17} />
                        </button>
                      </div>
                    </div>

                    {farmer && (
                      <>
                        <div className="farm-stat">
                          <span className="farm-stat-icon">
                            <Sprout size={20} />
                          </span>
                          <div>
                            <strong>
                              {available} <small>{tr("kg available")}</small>
                            </strong>
                            <span>
                              {
                                profiles.filter((p) => p.role === "restaurant")
                                  .length
                              }{" "}
                              {tr("connected kitchens · demo network")}
                            </span>
                          </div>
                        </div>
                        <span className="hero-stamp">
                          <Leaf size={13} />
                          {tr(
                            "Illustrative farm landscape · your harvest, connected",
                          )}
                        </span>
                      </>
                    )}
                  </section>
                  <div className="metrics">
                    <Metric
                      title={farmer ? "Available harvest" : "Inventory on hand"}
                      value={`${farmer ? available : inventory.reduce((s, b) => s + Number(b.quantity || 0), 0)} kg`}
                      note={
                        farmer
                          ? `${lots.length} harvest lots ready to trade`
                          : "Across your ingredient batches"
                      }
                      icon={
                        farmer ? <Sprout size={20} /> : <Package size={20} />
                      }
                    />
                    <Metric
                      title={farmer ? "Buyer offers" : "Purchase requirements"}
                      value={String(
                        farmer
                          ? offers.length
                          : state.requirements?.length || 0,
                      )}
                      note={
                        farmer
                          ? "You decide which offer to accept"
                          : "Approved by your kitchen"
                      }
                      icon={<Store size={20} />}
                    />
                    <Metric
                      title={tr("Active orders")}
                      value={String(
                        orders.filter(
                          (o) =>
                            !["cancelled", "settled", "released"].includes(
                              o.status,
                            ),
                        ).length,
                      )}
                      note="Track every step to collection"
                      icon={<Truck size={20} />}
                    />
                    <Metric
                      title={
                        farmer ? "Market reference" : "Suggested replenishment"
                      }
                      value={
                        farmer
                          ? "Agmarknet"
                          : hasForecast
                            ? `${suggestion} kg`
                            : "—"
                      }
                      note={
                        farmer
                          ? "Dated government report · Mandi prices"
                          : "Review before purchasing"
                      }
                      icon={<BarChart3 size={20} />}
                    />
                  </div>
                  <div className="dashboard-grid">
                    <section>
                      <div className="section-heading">
                        <div>
                          <div className="eyebrow">
                            {tr(
                              farmer ? "FROM YOUR FIELDS" : "FROM LOCAL FIELDS",
                            )}
                          </div>
                          <h2>
                            {tr(
                              farmer
                                ? "Your harvest, ready for its next chapter."
                                : "Fresh opportunities nearby.",
                            )}
                          </h2>
                        </div>
                        <button
                          className="text-button"
                          onClick={() =>
                            setPage(farmer ? "My harvest" : "Marketplace")
                          }
                        >
                          {tr("View all")}
                          <ArrowRight size={16} />
                        </button>
                      </div>
                      <div className="lots-grid">
                        {lots.slice(0, 1).map((l) => renderLotCard({ lot: l }))}
                        <article className="harvest-journey">
                          <div className="eyebrow">
                            {tr("THE PATH TO A BETTER DEAL")}
                          </div>
                          <h3>
                            {tr(
                              farmer
                                ? "From your fields."
                                : "For your business.",
                            )}
                            <br />
                            <em>
                              {tr(
                                farmer
                                  ? "To their kitchens."
                                  : "Plan. Buy. Receive.",
                              )}
                            </em>
                          </h3>
                          <div className="journey-path">
                            {[
                              {
                                label: farmer
                                  ? "Share your harvest"
                                  : "Find available produce",
                                description:
                                  "Clear quantities. Clear possibilities.",
                                page: farmer ? "My harvest" : "Marketplace",
                                icon: farmer ? Sprout : ShoppingCart,
                              },
                              {
                                label: farmer
                                  ? "Let the offers come"
                                  : "Set your buying limits",
                                description:
                                  "Your limits guide every negotiation.",
                                page: "Negotiations",
                                icon: Sparkles,
                              },
                              {
                                label: farmer
                                  ? "Choose. Confirm. Collect."
                                  : "Confirm and receive",
                                description: "People make the final decision.",
                                page: "Orders",
                                icon: Truck,
                              },
                            ].map((step, i) => (
                              <button
                                key={tr(step.label)}
                                onClick={() => setPage(step.page)}
                              >
                                <span className="step-icon">
                                  <step.icon size={18} />
                                </span>
                                <span>
                                  <strong>{tr(step.label)}</strong>
                                  <small>{tr(step.description)}</small>
                                </span>
                                <ArrowUpRight size={15} />
                              </button>
                            ))}
                          </div>
                          <div className="journey-foot">
                            <span className="pulse" />
                            {tr("Connected to")}{" "}
                            {
                              profiles.filter((p) => p.role === "restaurant")
                                .length
                            }{" "}
                            {tr(
                              farmer
                                ? "restaurant workspaces"
                                : "buyer workspaces",
                            )}
                          </div>
                        </article>
                      </div>
                    </section>
                    {farmer && (
                      <section className="market-card">
                        <span className="circle-icon">
                          <BarChart3 size={20} />
                        </span>
                        <div className="eyebrow">{tr("KNOW YOUR MARKET")}</div>
                        <h3>
                          {tr("Know the market.")}
                          <br />
                          <em>{tr("Own the conversation.")}</em>
                        </h3>
                        <p>
                          {tr(
                            "Compare government-published commodity prices before choosing an offer.",
                          )}
                        </p>
                        <p className="caption">
                          {tr(
                            "Dated national report. Local prices, grade and delivery costs can differ.",
                          )}
                        </p>
                        <button
                          className="button secondary"
                          onClick={() => setPage("Mandi prices")}
                        >
                          {tr("View government prices")}
                          <ArrowUpRight size={16} />
                        </button>
                      </section>
                    )}
                  </div>
                  <div className="journey-strip">
                    <span className="circle-icon">
                      <ShieldCheck size={22} />
                    </span>
                    <div>
                      <h3>{tr("Confidence at every step.")}</h3>
                      <p>
                        {tr(
                          "Clear offers. Your approval. Simulated payment protection.",
                        )}
                      </p>
                    </div>
                    <button
                      className="text-button"
                      onClick={() => setPage("Orders")}
                    >
                      {tr("Follow your orders")}
                      <ArrowRight size={17} />
                    </button>
                  </div>
                </>
              )}
              {(page === "My harvest" || page === "Marketplace") && (
                <>
                  <div className="section-heading">
                    <div>
                      <div className="eyebrow">{tr("FRESH CONNECTIONS")}</div>
                      <h1 className="page-title">
                        {tr(
                          farmer
                            ? "Good things start here."
                            : "Meet your next harvest.",
                        )}
                      </h1>
                      <p>
                        {tr(
                          farmer
                            ? "Publish your produce and let nearby demand find you."
                            : "Create a requirement, then let your agent negotiate within your limits.",
                        )}
                      </p>
                    </div>
                    {farmer && (
                      <div className="actions">
                        <button
                          className="button secondary"
                          onClick={() => {
                            setImportKind("harvest");
                            setSheet(null);
                            setCsv("");
                            setSheet(null);
                            setModal("import");
                          }}
                        >
                          <Upload size={16} />
                          {tr("Import Excel / CSV")}
                        </button>
                        <button
                          className="button"
                          onClick={() => setModal("lot")}
                        >
                          <Plus size={16} />
                          {tr("New harvest")}
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="lots-grid wide">
                    {lots.map((l) => renderLotCard({ lot: l }))}
                  </div>
                  {!lots.length && (
                    <Empty>
                      {tr("No harvests yet. Add your first listing.")}
                    </Empty>
                  )}
                </>
              )}
              {page === "Inventory & forecast" && renderForecast()}
              {page === "Negotiations" && renderOffers()}
              {page === "Orders" && renderOrders()}
              {page === "Agent settings" && (
                <>
                  <div className="section-heading">
                    <div>
                      <h1 className="page-title">
                        {tr("Your agent. Your boundaries.")}
                      </h1>
                      <p>
                        {tr(
                          "Private limits guide negotiation. They never authorize a final sale.",
                        )}
                      </p>
                    </div>
                    <Badge>
                      <ShieldCheck size={12} />
                      {tr("Private to your workspace")}
                    </Badge>
                  </div>
                  <section className="panel settings">
                    <form onSubmit={(e) => submit(e, "/policy")}>
                      <h3>{tr("Negotiation policy")}</h3>
                      <p className="muted">
                        {tr("Your agent cannot exceed these hard limits.")}
                      </p>
                      <div className="form-grid">
                        {farmer ? (
                          <Field
                            label={tr("Minimum selling price (₹ / kg)")}
                            name="min_price"
                            type="number"
                            value={policy.min_price}
                          />
                        ) : (
                          <>
                            <Field
                              label={tr("Maximum purchase price (₹ / kg)")}
                              name="max_price"
                              type="number"
                              value={policy.max_price}
                            />
                            <Field
                              label={tr("Maximum order budget (₹)")}
                              name="max_budget"
                              type="number"
                              value={policy.max_budget}
                            />
                          </>
                        )}
                        <Field
                          label={
                            farmer
                              ? "Minimum order quantity (kg)"
                              : "Desired quantity (kg)"
                          }
                          name="quantity"
                          type="number"
                          value={policy.quantity || 40}
                        />
                        <Field
                          label={tr("Service radius (km)")}
                          name="radius_km"
                          type="number"
                          value={policy.radius_km || 50}
                        />
                      </div>
                      <button disabled={busy} className="button">
                        <Check size={17} />
                        {tr("Save my limits")}
                      </button>
                    </form>
                    <div className="settings-explainer">
                      <Sparkles size={28} />
                      <h3>{tr("Assistance with a clear boundary.")}</h3>
                      <p>
                        {tr("Negotiation uses")}{" "}
                        {tr(
                          typeof state?.mode === "object" &&
                            state.mode.negotiation === "openai"
                            ? "AI proposals with server-side validation"
                            : "a bounded local rule-based engine",
                        )}
                        {tr(
                          ". It compares eligible terms without disclosing private limits.",
                        )}
                      </p>
                      <p>
                        {tr(
                          "The farmer selects the buyer. The buyer confirms the agreement. No real funds move.",
                        )}
                      </p>
                    </div>
                  </section>
                </>
              )}
              <footer>
                <span>
                  <Sprout size={14} />
                  {tr("HarvestLink · Built for better connections")}
                </span>
                <span>
                  {tr("Synthetic demo data ·")}{" "}
                  {tr(
                    typeof state?.mode === "object" &&
                      state.mode.negotiation === "openai"
                      ? "AI-assisted negotiation"
                      : "Rule-based negotiation",
                  )}{" "}
                  {tr("· Simulated payments")}
                </span>
              </footer>
            </>
          )}
        </div>
      </main>
      {modal && (
        <div className="modal-backdrop" onClick={() => !busy && setModal("")}>
          <section
            ref={modalRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-label={pretty(modal)}
            className="modal"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="modal-close icon-button"
              aria-label={tr("Close dialog")}
              disabled={busy}
              onClick={() => setModal("")}
            >
              <X size={20} />
            </button>
            {modal === "request" && requestLot && (
              <>
                <div className="eyebrow">
                  {tr("BUYER-APPROVED REQUIREMENT")}
                </div>
                <h2>
                  {tr("Request")}
                  {requestLot.crop}
                  {tr(".")}
                </h2>
                <p className="muted">
                  {tr(
                    "Choose a quantity within your budget. This creates a provisional requirement, not a purchase.",
                  )}
                </p>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const q = Number(
                      new FormData(e.currentTarget).get("quantity"),
                    );
                    action(
                      "/requirements",
                      { lot_id: requestLot.id, quantity: q },
                      "Purchase request created. Open Negotiations to submit your offer.",
                    );
                  }}
                >
                  <Field
                    label={tr("Requested quantity (kg)")}
                    name="quantity"
                    type="number"
                    value={
                      String(requestLot.crop).toLowerCase() === "tomato"
                        ? hasForecast
                          ? suggestion
                          : Number(policy.quantity || 1)
                        : policy.quantity || 10
                    }
                  />
                  <button className="button full" disabled={busy}>
                    {tr("Approve purchase requirement")}
                    <ArrowRight size={16} />
                  </button>
                </form>
              </>
            )}
            {modal === "lot" && (
              <>
                <div className="eyebrow">{tr("FROM YOUR FIELDS")}</div>
                <h2>{tr("List your next harvest.")}</h2>
                <p className="muted">
                  {tr(
                    "Give buyers the details they need to make a clear offer.",
                  )}
                </p>
                <form onSubmit={(e) => submit(e, "/lots")}>
                  <div className="form-grid">
                    <Field label={tr("Crop")} name="crop" value="Tomato" />
                    <Field label={tr("Variety")} name="variety" value="Local" />
                    <Field
                      label={tr("Declared grade")}
                      name="grade"
                      value="A"
                    />
                    <Field
                      label={tr("Quantity (kg)")}
                      name="quantity"
                      type="number"
                      value={100}
                    />
                    <Field
                      label={tr("Asking price (₹ / kg)")}
                      name="ask_price"
                      type="number"
                      value={30}
                    />
                    <Field
                      label={tr("Harvest date")}
                      name="harvest_date"
                      type="date"
                      value={new Date().toISOString().slice(0, 10)}
                    />
                    <Field
                      label={tr("Available from")}
                      name="available_date"
                      type="date"
                      value={new Date().toISOString().slice(0, 10)}
                    />
                  </div>
                  <button className="button full" disabled={busy}>
                    {tr("Publish harvest")}
                    <ArrowRight size={17} />
                  </button>
                </form>
              </>
            )}
            {modal === "profile" && (
              <>
                <h2>{tr("Make it your workspace.")}</h2>
                <form onSubmit={(e) => submit(e, "/profile")}>
                  <Field
                    label={tr("Your display name")}
                    name="name"
                    value={profile.name}
                  />
                  <Field
                    label={tr("Location")}
                    name="location"
                    value={profile.location || "Mangaluru"}
                  />
                  <button className="button full" disabled={busy}>
                    {tr("Save profile")}
                  </button>
                </form>
              </>
            )}
            {modal === "import" && (
              <>
                <div className="eyebrow">{tr("A SIMPLE START")}</div>
                <h2>
                  {tr("Import")}
                  {importKind}
                  {tr("data.")}
                </h2>
                <p className="muted">
                  {tr(
                    "Use the template columns. Your file is validated before records are added. Inventory imports append batches; consumption imports reject duplicate dates.",
                  )}
                </p>
                <div className="import-tabs">
                  {(farmer ? ["harvest"] : ["inventory", "consumption"]).map(
                    (k) => (
                      <button
                        key={k}
                        className={k === importKind ? "selected" : ""}
                        onClick={() => {
                          setImportKind(k);
                          setCsv("");
                          setSheet(null);
                        }}
                      >
                        {pretty(k)}
                      </button>
                    ),
                  )}
                </div>
                <a
                  className="download-link"
                  href={`/api/templates/${importKind}.csv`}
                  download
                >
                  <ArrowDownToLine size={16} />
                  {tr("Download CSV template")}
                </a>
                <label className="upload-zone">
                  <Upload size={26} />
                  <strong>{tr("Choose Excel or CSV")}</strong>
                  <span>{tr("Or paste your CSV below")}</span>
                  <input
                    type="file"
                    accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                    onChange={async (e) => {
                      const f = e.target.files?.[0];
                      if (!f) return;
                      setSheet(null);
                      setCsv("");
                      if (f.size > 2_000_000) {
                        setError("File must be smaller than 2 MB");
                        return;
                      }
                      try {
                        if (f.name.toLowerCase().endsWith(".xlsx")) {
                          const bytes = new Uint8Array(await f.arrayBuffer());
                          let binary = "";
                          for (const b of bytes)
                            binary += String.fromCharCode(b);
                          const res = await fetch("/api/spreadsheets/preview", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              kind: importKind,
                              content: btoa(binary),
                            }),
                          });
                          const data = await res.json();
                          if (!res.ok) throw Error(data.detail);
                          setCsv(data.csv);
                          setSheet({ ...data, name: f.name });
                        } else setCsv(await f.text());
                      } catch (e) {
                        setError((e as Error).message);
                      }
                    }}
                  />
                </label>
                {!farmer && (
                  <label className="replace-label">
                    <input
                      type="checkbox"
                      checked={replaceImport}
                      onChange={(e) => setReplaceImport(e.target.checked)}
                    />
                    {tr("Replace this workspace’s existing")}
                    {importKind}
                    {tr("records")}
                  </label>
                )}
                {sheet && (
                  <section
                    className="sheet-preview"
                    aria-label="Excel workbook preview"
                  >
                    <strong>
                      {sheet.name} · {sheet.count} {tr("crop rows")}
                    </strong>
                    <div className="table-scroll">
                      <table>
                        <thead>
                          <tr>
                            {sheet.headers.map((h: string) => (
                              <th key={h}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {sheet.rows.map((r: any[], i: number) => (
                            <tr key={i}>
                              {r.map((v: any, j: number) => (
                                <td key={j}>{String(v)}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <p>
                      {tr(
                        "Preview only. Validate and import to save these rows.",
                      )}
                    </p>
                  </section>
                )}
                <a href={`/api/templates/${importKind}.xlsx`} download>
                  {tr("Download Excel template")}
                </a>
                <textarea
                  aria-label={tr("CSV contents")}
                  value={csv}
                  onChange={(e) => {
                    setCsv(e.target.value);
                    setSheet(null);
                  }}
                  placeholder={tr("Paste CSV with header row…")}
                  rows={5}
                />
                <button
                  className="button full"
                  disabled={busy || !csv.trim()}
                  onClick={() =>
                    action(
                      `/import/${importKind}`,
                      { csv, replace: !farmer && replaceImport },
                      "Spreadsheet imported successfully",
                    )
                  }
                >
                  {tr("Validate & import")}
                  <ArrowRight size={17} />
                </button>
              </>
            )}
            {modal === "reset" && (
              <>
                <RefreshCw size={30} />
                <h2>{tr("A fresh start for the demo?")}</h2>
                <p>
                  {tr(
                    "This resets listings, requirements, orders and policies to the original sample data.",
                  )}
                </p>
                <button
                  className="button full"
                  disabled={busy}
                  onClick={() =>
                    action("/reset", {}, "Demo reset to its starting state")
                  }
                >
                  {tr("Reset demo data")}
                </button>
              </>
            )}
            {error && (
              <div className="alert error" role="alert">
                {tr(error)}
              </div>
            )}
            {busy && (
              <p role="status" className="muted">
                {tr(busyText)}
              </p>
            )}
          </section>
        </div>
      )}
      {farmer && <Assistant />}
    </div>
  );
}
function Metric({
  title,
  value,
  note,
  icon,
}: {
  title: string;
  value: string;
  note: string;
  icon: ReactNode;
}) {
  const { tr } = useLocale();
  return (
    <article className="metric">
      <div>
        <span>{tr(title)}</span>
        {icon}
      </div>
      <strong>{value}</strong>
      <p>{tr(note)}</p>
    </article>
  );
}
