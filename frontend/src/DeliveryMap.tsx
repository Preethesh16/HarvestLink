import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Play, RotateCcw } from "lucide-react";
import { useLocale } from "./Locale";
type Props = { buyer: string; buyerName: string; status: string };
const farm: L.LatLngTuple = [12.893, 75.033];
const destinations: Record<string, L.LatLngTuple> = {
  r1: [12.87, 74.88],
  r2: [12.985, 74.805],
  r3: [12.79, 74.887],
};
export default function DeliveryMap({ buyer, buyerName, status }: Props) {
  const { tr } = useLocale();
  const container = useRef<HTMLDivElement>(null);
  const marker = useRef<L.Marker | null>(null);
  const [progress, setProgress] = useState(0),
    [running, setRunning] = useState(false),
    [tileError, setTileError] = useState(false);
  const destination = destinations[buyer] || destinations.r1;
  const points: L.LatLngTuple[] = [
    farm,
    [12.884, 74.995],
    [12.875, 74.96],
    [12.868, 74.915],
    destination,
  ];
  useEffect(() => {
    if (!container.current) return;
    const map = L.map(container.current, { scrollWheelZoom: false }).fitBounds(
      L.latLngBounds(points),
      { padding: [40, 40] },
    );
    L.tileLayer(
      import.meta.env.VITE_MAP_TILE_URL ||
        "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
      {
        maxZoom: 16,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      },
    )
      .on("tileerror", () => setTileError(true))
      .addTo(map);
    L.polyline(points, { color: "#3e7251", weight: 4, dashArray: "8 8" }).addTo(
      map,
    );
    L.circleMarker(farm, { radius: 8, color: "#244b33", fillOpacity: 1 })
      .addTo(map)
      .bindTooltip("Farm pickup · illustrative location");
    const label = document.createElement("span");
    label.textContent = buyerName + " · illustrative destination";
    L.circleMarker(destination, { radius: 8, color: "#b4803d", fillOpacity: 1 })
      .addTo(map)
      .bindTooltip(label);
    marker.current = L.marker(farm, {
      title: "Simulated delivery vehicle",
      icon: L.divIcon({
        className: "delivery-truck",
        html: '<span aria-hidden="true">🚚</span>',
        iconSize: [40, 40],
        iconAnchor: [20, 20],
      }),
    }).addTo(map);
    const resize = new ResizeObserver(() => map.invalidateSize());
    resize.observe(container.current);
    return () => {
      resize.disconnect();
      map.remove();
      marker.current = null;
    };
  }, [buyer, buyerName]);
  useEffect(() => {
    setProgress(0);
    setRunning(false);
  }, [buyer, status]);
  useEffect(() => {
    if (!running) return;
    const timer = setInterval(
      () =>
        setProgress((p) => {
          if (p >= 100) {
            setRunning(false);
            return 100;
          }
          return p + 1;
        }),
      100,
    );
    return () => clearInterval(timer);
  }, [running]);
  useEffect(() => {
    const n = (progress / 100) * (points.length - 1),
      i = Math.min(points.length - 2, Math.floor(n)),
      f = n - i;
    marker.current?.setLatLng([
      points[i][0] + (points[i + 1][0] - points[i][0]) * f,
      points[i][1] + (points[i + 1][1] - points[i][1]) * f,
    ]);
  }, [progress, buyer]);
  const eligible = ["funded", "picked_up", "received", "settled"].includes(
    status,
  );
  return (
    <section
      className="delivery-section"
      aria-label={tr("Delivery simulation")}
    >
      <div className="panel-heading">
        <div>
          <div className="eyebrow">{tr("FARM → BUYER")}</div>
          <h3>{tr("Follow the delivery.")}</h3>
          <p>
            {tr(
              "Illustrative route and vehicle movement. No live GPS or courier tracking.",
            )}
          </p>
        </div>
        <span className="badge">{tr("Simulation")}</span>
      </div>
      <div
        ref={container}
        className="delivery-map"
        aria-label={tr("Farm-to-buyer map")}
      />
      {tileError && (
        <p role="status">
          {tr("Map tiles unavailable. The illustrative route remains visible.")}
        </p>
      )}
      <div className="delivery-controls">
        <button
          className="button secondary"
          disabled={!eligible || running}
          onClick={() => {
            setProgress(0);
            setRunning(true);
          }}
        >
          {progress === 100 ? <RotateCcw size={16} /> : <Play size={16} />}{" "}
          {tr("Play delivery simulation")}
        </button>
        <progress
          value={progress}
          max="100"
          aria-label={tr("Simulated journey progress")}
        />
        <span aria-live="polite">
          {tr(
            progress === 100
              ? "Simulation complete"
              : running
                ? "Simulated vehicle in transit"
                : "Ready to preview",
          )}
        </span>
      </div>
      <small>
        {tr(
          "Playback does not change the order. Pickup and receipt require separate confirmation.",
        )}
      </small>
    </section>
  );
}
