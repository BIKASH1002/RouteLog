import { useEffect, useMemo } from "react";
import {
  MapContainer,
  TileLayer,
  Polyline,
  Marker,
  Popup,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Plus, Minus, Maximize2, Navigation2 } from "lucide-react";
import type { Trip } from "../../lib/types";
import { formatTimeRange } from "../../lib/format";

interface Props {
  trip: Trip;
}

// ---------------- icons ----------------

function numberedIcon(n: number, color: string) {
  return L.divIcon({
    html: `<div style="background:${color};color:#fff;width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;border:3px solid #fff;box-shadow:0 2px 8px rgba(15,23,42,0.3)">${n}</div>`,
    className: "",
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

function stopIcon(kind: string) {
  const colors: Record<string, string> = {
    fuel: "#14B8A6",
    break: "#94A3B8",
    rest: "#7C3AED",
    pickup: "#F59E0B",
    dropoff: "#2563EB",
    stop: "#64748B",
  };
  const color = colors[kind] ?? "#64748B";
  return L.divIcon({
    html: `<div style="background:${color};width:18px;height:18px;border-radius:50%;border:3px solid #fff;box-shadow:0 1px 4px rgba(15,23,42,0.3)"></div>`,
    className: "",
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
}

// ---------------- helpers ----------------

const KIND_LABEL: Record<string, string> = {
  fuel: "Fuel & Service",
  break: "Rest Break",
  rest: "Overnight Rest",
  pickup: "Pickup",
  dropoff: "Final Drop",
  stop: "Waypoint",
};

const KIND_COLOR: Record<string, string> = {
  driving: "#16A34A",
  on_duty_not_driving: "#F59E0B",
  sleeper: "#7C3AED",
  off_duty: "#94A3B8",
  origin: "#16A34A",
  pickup: "#F59E0B",
  dropoff: "#2563EB",
  fuel: "#14B8A6",
  break: "#94A3B8",
  rest: "#7C3AED",
  stop: "#64748B",
};

function FitOnce({ points }: { points: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length < 2) return;
    const b = L.latLngBounds(points.map(([a, c]) => L.latLng(a, c)));
    map.fitBounds(b, { padding: [40, 40] });
  }, [map, points]);
  return null;
}

function MapControls({ points }: { points: [number, number][] }) {
  const map = useMap();
  const fit = () => {
    const b = L.latLngBounds(points.map(([a, c]) => L.latLng(a, c)));
    map.fitBounds(b, { padding: [40, 40] });
  };
  const btn =
    "w-9 h-9 flex items-center justify-center bg-white border border-slate-200 rounded-lg shadow-card text-slate-600 hover:text-navy hover:bg-slate-50 transition-colors";
  return (
    <div className="absolute top-4 right-4 z-[500] flex flex-col gap-2">
      <button className={btn} onClick={() => map.zoomIn()} aria-label="Zoom in">
        <Plus size={15} />
      </button>
      <button className={btn} onClick={() => map.zoomOut()} aria-label="Zoom out">
        <Minus size={15} />
      </button>
      <button className={btn} onClick={fit} aria-label="Fit">
        <Maximize2 size={14} />
      </button>
    </div>
  );
}

function FeasibilityCard({ trip }: { trip: Trip }) {
  const s = trip.plan.summary;
  const maxShift = 14;
  const driveLeft = Math.max(0, 11 - s.driving_hours / Math.max(s.days, 1));
  return (
    <div className="absolute top-4 left-4 z-[500] w-[260px] bg-white/95 backdrop-blur rounded-xl border border-slate-200 shadow-pop p-3.5">
      <div className="flex items-center gap-2 mb-2.5">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
        <span className="text-2xs font-bold uppercase tracking-wider text-emerald-600">
          Route Feasibility: Pass
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div>
          <div className="label-xs mb-0.5">Max Shift</div>
          <div className="font-semibold text-navy">
            {Math.min(s.total_hours, maxShift).toFixed(1)}h / {maxShift}h
          </div>
        </div>
        <div>
          <div className="label-xs mb-0.5">Drive Remaining</div>
          <div className="font-semibold text-navy">
            {driveLeft.toFixed(1)}h / 11h
          </div>
        </div>
      </div>
    </div>
  );
}

function MapLegend() {
  const items = [
    { label: "Driving", color: KIND_COLOR.driving },
    { label: "On-Duty", color: KIND_COLOR.on_duty_not_driving },
    { label: "Sleeper Berth", color: KIND_COLOR.sleeper },
    { label: "Off Duty", color: KIND_COLOR.off_duty },
    { label: "Fuel/Service", color: KIND_COLOR.fuel },
  ];
  return (
    <div className="absolute bottom-4 left-4 z-[500] bg-white/95 backdrop-blur rounded-xl border border-slate-200 shadow-card px-3.5 py-3">
      <div className="label-xs mb-2">FMCSA Duty Status Legend</div>
      <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1.5">
        {items.map((it) => (
          <div key={it.label} className="flex items-center gap-1.5">
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ background: it.color }}
            />
            <span className="text-2xs text-slate-700 font-medium">
              {it.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------- main ----------------

export function LightRouteMap({ trip }: Props) {
  const plan = trip.plan;
  const points = plan.route.geometry;

  const bounds = useMemo(() => {
    const b = L.latLngBounds(points.map(([a, c]) => L.latLng(a, c)));
    return b;
  }, [points]);

  return (
    <div className="card p-0 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-md bg-brand-subtle text-brand flex items-center justify-center">
            <Navigation2 size={14} />
          </div>
          <div>
            <div className="text-sm font-semibold text-navy leading-tight">
              Interstate Dispatch Telemetry
            </div>
            <div className="text-2xs text-slate-500">
              Route #RL-{String(trip.trip_id).padStart(4, "0")}
            </div>
          </div>
        </div>
        <div className="text-2xs text-slate-500 hidden md:block">
          {plan.summary.total_miles.toFixed(0)} mi ·{" "}
          {plan.summary.days} {plan.summary.days === 1 ? "day" : "days"} ·{" "}
          {trip.plan.stops.length} stops
        </div>
      </div>

      <div className="relative" style={{ height: 520 }}>
        <MapContainer
          bounds={bounds}
          scrollWheelZoom={true}
          zoomControl={false}
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer
            attribution="&copy; OpenStreetMap contributors"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Route */}
          <Polyline
            positions={points}
            pathOptions={{ color: "#2563EB", weight: 4, opacity: 0.85 }}
          />

          {/* Origin */}
          <Marker
            position={[trip.locations.origin.lat, trip.locations.origin.lng]}
            icon={numberedIcon(1, "#16A34A")}
          >
            <Popup>
              <div className="text-xs">
                <div className="font-semibold text-navy">
                  {trip.locations.origin.label}
                </div>
                <div className="text-slate-500 mt-0.5">Origin · Mile 0</div>
              </div>
            </Popup>
          </Marker>

          {/* Pickup */}
          <Marker
            position={[trip.locations.pickup.lat, trip.locations.pickup.lng]}
            icon={numberedIcon(2, "#F59E0B")}
          >
            <Popup>
              <div className="text-xs">
                <div className="font-semibold text-navy">
                  {trip.locations.pickup.label}
                </div>
                <div className="text-slate-500 mt-0.5">Pickup · 1h on-duty</div>
              </div>
            </Popup>
          </Marker>

          {/* Dropoff */}
          <Marker
            position={[trip.locations.dropoff.lat, trip.locations.dropoff.lng]}
            icon={numberedIcon(3, "#2563EB")}
          >
            <Popup>
              <div className="text-xs">
                <div className="font-semibold text-navy">
                  {trip.locations.dropoff.label}
                </div>
                <div className="text-slate-500 mt-0.5">
                  Dropoff · 1h on-duty
                </div>
              </div>
            </Popup>
          </Marker>

          {/* Stops */}
          {plan.stops.map((s, i) => (
            <Marker
              key={i}
              position={[s.lat, s.lng]}
              icon={stopIcon(s.kind)}
            >
              <Popup>
                <div className="text-xs">
                  <div className="font-semibold text-navy">
                    {KIND_LABEL[s.kind] ?? "Stop"}
                  </div>
                  <div className="text-slate-500 mt-0.5">{s.label}</div>
                  <div className="text-slate-400 mt-1 text-2xs">
                    Mile {s.miles.toFixed(0)} · {s.hours.toFixed(2)}h ·{" "}
                    {formatTimeRange(s.start, s.end)}
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}

          <FitOnce points={points} />
          <MapControls points={points} />
        </MapContainer>

        <FeasibilityCard trip={trip} />
        <MapLegend />
      </div>
    </div>
  );
}