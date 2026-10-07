import { useEffect } from "react";
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
import { Route, ArrowRight } from "lucide-react";
import { Card, CardHeader } from "../ui/Card";
import { Chip } from "../ui/Chip";
import type { Trip } from "../../lib/types";

interface Props {
  trip: Trip | null;
}

function makeNumberedIcon(n: number, color: string) {
  return L.divIcon({
    html: `<div style="background:${color};color:#fff;width:26px;height:26px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;border:2px solid #fff;box-shadow:0 2px 6px rgba(15,23,42,0.25)">${n}</div>`,
    className: "",
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  });
}

function makeStopIcon(kind: string) {
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
    html: `<div style="background:${color};width:16px;height:16px;border-radius:50%;border:2px solid #fff;box-shadow:0 1px 3px rgba(15,23,42,0.3)"></div>`,
    className: "",
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });
}

function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length < 2) return;
    const bounds = L.latLngBounds(points.map(([a, b]) => L.latLng(a, b)));
    map.fitBounds(bounds, { padding: [24, 24] });
  }, [map, points]);
  return null;
}

function EmptyPreview() {
  return (
    <div className="h-[368px] rounded-lg bg-gradient-to-br from-slate-100 to-slate-50 border border-slate-200 flex flex-col items-center justify-center text-center px-6">
      <div className="w-12 h-12 rounded-full bg-white border border-slate-200 flex items-center justify-center mb-3 text-slate-400">
        <Route size={22} />
      </div>
      <p className="text-sm font-medium text-navy">No route computed yet</p>
      <p className="text-xs text-slate-500 mt-1 max-w-xs leading-relaxed">
        Fill in the trip details on the left and click Generate to see the route
        trajectory, HOS-compliant stop sequence, and fuel windows.
      </p>
    </div>
  );
}

const KIND_LABEL: Record<string, string> = {
  pickup: "Live loading",
  dropoff: "Final drop",
  fuel: "Fueling",
  break: "Mandatory break",
  rest: "Overnight rest",
  stop: "Stop",
};

const KIND_COLOR: Record<string, string> = {
  origin: "#16A34A",
  pickup: "#F59E0B",
  dropoff: "#2563EB",
  fuel: "#14B8A6",
  break: "#94A3B8",
  rest: "#7C3AED",
  stop: "#64748B",
};

function StopRow({
  kind,
  title,
  sub,
  miles,
}: {
  kind: string;
  title: string;
  sub: string;
  miles: number;
}) {
  return (
    <div className="flex items-start gap-3">
      <div
        className="mt-1.5 w-3 h-3 rounded-full border-2 border-white shadow shrink-0"
        style={{ background: KIND_COLOR[kind] ?? "#64748B" }}
      />
      <div className="flex-1 min-w-0">
        <div className="text-xs font-semibold text-navy truncate">{title}</div>
        <div className="text-2xs text-slate-500">{sub}</div>
      </div>
      <div className="text-xs font-medium text-slate-600 shrink-0 whitespace-nowrap">
        {miles === 0 ? "Mile 0" : `+${miles.toFixed(0)} mi`}
      </div>
    </div>
  );
}

export function RouteTrajectoryPreview({ trip }: Props) {
  const plan = trip?.plan;
  const hasPlan = !!(plan && plan.route.geometry.length > 1);

  return (
    <Card>
      <CardHeader
        icon={<Route size={14} />}
        title="Route Trajectory Preview"
        right={
          <Chip tone="neutral">
            {trip
              ? `Estimate #RT-${String(trip.trip_id).padStart(4, "0")}`
              : "Awaiting input"}
          </Chip>
        }
      />

      {!hasPlan || !plan ? (
        <EmptyPreview />
      ) : (
        <>
          <div className="h-[368px] rounded-lg overflow-hidden border border-slate-200">
            <MapContainer
              bounds={L.latLngBounds(
                plan.route.geometry.map(([a, b]) => L.latLng(a, b))
              )}
              scrollWheelZoom={false}
              zoomControl={false}
              style={{ height: "100%", width: "100%" }}
            >
              <TileLayer
                attribution="&copy; OpenStreetMap"
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <Polyline
                positions={plan.route.geometry}
                pathOptions={{ color: "#2563EB", weight: 4, opacity: 0.9 }}
              />
              <Marker
                position={[trip.locations.origin.lat, trip.locations.origin.lng]}
                icon={makeNumberedIcon(1, "#16A34A")}
              >
                <Popup>{trip.locations.origin.label}</Popup>
              </Marker>
              <Marker
                position={[trip.locations.pickup.lat, trip.locations.pickup.lng]}
                icon={makeNumberedIcon(2, "#F59E0B")}
              >
                <Popup>{trip.locations.pickup.label}</Popup>
              </Marker>
              <Marker
                position={[
                  trip.locations.dropoff.lat,
                  trip.locations.dropoff.lng,
                ]}
                icon={makeNumberedIcon(3, "#2563EB")}
              >
                <Popup>{trip.locations.dropoff.label}</Popup>
              </Marker>
              {plan.stops.map((s, i) => (
                <Marker
                  key={i}
                  position={[s.lat, s.lng]}
                  icon={makeStopIcon(s.kind)}
                >
                  <Popup>
                    <div className="text-xs">
                      <div className="font-semibold">{s.label}</div>
                      <div className="text-slate-500">
                        Mile {s.miles.toFixed(0)}
                      </div>
                    </div>
                  </Popup>
                </Marker>
              ))}
              <FitBounds points={plan.route.geometry} />
            </MapContainer>
          </div>

          {/* Route summary */}
          <div className="mt-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-1.5 text-xs text-slate-600 min-w-0">
                <span className="truncate max-w-[110px] font-semibold text-navy">
                  {trip.current_location}
                </span>
                <ArrowRight size={11} className="text-slate-400 shrink-0" />
                <span className="truncate max-w-[110px] font-semibold text-navy">
                  {trip.pickup_location}
                </span>
                <ArrowRight size={11} className="text-slate-400 shrink-0" />
                <span className="truncate max-w-[110px] font-semibold text-navy">
                  {trip.dropoff_location}
                </span>
              </div>
              <div className="text-right shrink-0">
                <span className="text-2xl font-bold text-brand">
                  {plan.summary.total_miles.toFixed(0)}
                </span>
                <span className="text-xs text-slate-500 ml-1">mi</span>
              </div>
            </div>

            <div className="mt-3 h-1.5 rounded-full bg-slate-100 overflow-hidden flex">
              <div className="h-full bg-brand" style={{ width: "58%" }} />
              <div className="h-full bg-emerald-400" style={{ width: "42%" }} />
            </div>

            <div className="grid grid-cols-3 gap-3 mt-4">
              <div>
                <div className="label-xs mb-1">Total Transit</div>
                <div className="text-sm font-bold text-navy">
                  {Math.floor(plan.summary.total_hours)}h{" "}
                  {Math.round((plan.summary.total_hours % 1) * 60)}m
                </div>
              </div>
              <div>
                <div className="label-xs mb-1">HOS Days</div>
                <div className="text-sm font-bold text-navy">
                  {plan.summary.days}{" "}
                  {plan.summary.days === 1 ? "Day" : "Days"}
                </div>
              </div>
              <div>
                <div className="label-xs mb-1">Cycle End</div>
                <div className="text-sm font-bold text-navy">
                  {plan.summary.cycle_hours_at_end.toFixed(1)}h / 70h
                </div>
              </div>
            </div>
          </div>

          {/* Sequenced stops */}
          <div className="mt-5 pt-4 border-t border-slate-200">
            <div className="label-xs mb-3">
              Sequenced Stops &amp; Fuel Windows
            </div>
            <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
              <StopRow
                kind="origin"
                title={trip.locations.origin.label}
                sub="Depart"
                miles={0}
              />
              {plan.stops.map((s, i) => (
                <StopRow
                  key={i}
                  kind={s.kind}
                  title={s.label}
                  sub={KIND_LABEL[s.kind] ?? "Stop"}
                  miles={s.miles}
                />
              ))}
            </div>
          </div>
        </>
      )}
    </Card>
  );
}