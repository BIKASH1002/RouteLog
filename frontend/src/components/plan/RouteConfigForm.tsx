import { useState } from "react";
import {
  Route as RouteIcon,
  Clock,
  Fuel,
  UserCheck,
  Calendar,
} from "lucide-react";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { Chip } from "../ui/Chip";
import { LocationInput } from "./LocationInput";
import { planTrip } from "../../lib/api";
import type { GeocodeCandidate, PlanTripRequest, Trip } from "../../lib/types";

interface PrefillValues {
  current: string;
  pickup: string;
  dropoff: string;
  cycle: number;
}

interface Props {
  onPlanned: (trip: Trip) => void;
  initialValues?: PrefillValues | null;
}

export function RouteConfigForm({ onPlanned, initialValues }: Props) {
  const [current, setCurrent] = useState(initialValues?.current ?? "");
  const [pickup, setPickup] = useState(initialValues?.pickup ?? "");
  const [dropoff, setDropoff] = useState(initialValues?.dropoff ?? "");
  const [cycleUsed, setCycleUsed] = useState(initialValues?.cycle ?? 24);

  const [coords, setCoords] = useState<{
    origin?: GeocodeCandidate;
    pickup?: GeocodeCandidate;
    dropoff?: GeocodeCandidate;
  }>({});

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit =
    current.trim().length > 0 &&
    pickup.trim().length > 0 &&
    dropoff.trim().length > 0 &&
    !loading;

  const clearForm = () => {
    setCurrent("");
    setPickup("");
    setDropoff("");
    setCycleUsed(24);
    setCoords({});
    setError(null);
  };

  const onSubmit = async () => {
    setLoading(true);
    setError(null);

    const req: PlanTripRequest = {
      current_location: current.trim(),
      pickup_location: pickup.trim(),
      dropoff_location: dropoff.trim(),
      current_cycle_used: cycleUsed,
      start_time: new Date().toISOString(),
    };

    try {
      const res = await planTrip(req);
      if (res.success) {
        onPlanned(res.data.trip);
      } else {
        setError(res.errors?.[0] ?? "Unable to plan trip.");
      }
    } catch {
      setError("Network error. Is the backend running?");
    } finally {
      setLoading(false);
    }
  };

  const cycleRemaining = 70 - cycleUsed;

  return (
    <Card>
      <div className="flex items-start gap-2.5 mb-5">
        <div className="mt-0.5 w-8 h-8 rounded-md bg-brand-subtle text-brand flex items-center justify-center">
          <RouteIcon size={16} />
        </div>
        <div>
          <h3 className="text-[15px] font-semibold text-navy">
            Dispatch Route Configuration
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Verify coordinates, terminal stop times, and 70-hour cycle budget.
          </p>
        </div>
      </div>

      <div className="relative space-y-4">
        <div
          className="absolute border-l-2 border-dashed border-slate-200 pointer-events-none"
          style={{ left: "11px", top: "34px", bottom: "120px" }}
        />

        <div className="flex gap-3">
          <div className="flex flex-col items-center pt-6">
            <span className="relative z-10 w-6 h-6 rounded-full bg-brand text-white text-2xs font-bold flex items-center justify-center">
              1
            </span>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="label-xs">Current Location</span>
              <Chip tone="brand">Origin</Chip>
            </div>
            <LocationInput
              value={current}
              onChange={setCurrent}
              onSelect={(c) => setCoords((p) => ({ ...p, origin: c }))}
              placeholder="e.g. Dallas, TX"
              rightSlot={
                coords.origin && (
                  <span className="text-2xs font-semibold text-emerald-600">
                    Geocoded
                  </span>
                )
              }
            />
          </div>
        </div>

        <div className="flex gap-3">
          <div className="flex flex-col items-center pt-6">
            <span className="relative z-10 w-6 h-6 rounded-full bg-brand text-white text-2xs font-bold flex items-center justify-center">
              2
            </span>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="label-xs">Pickup Location</span>
              <Chip tone="neutral">Dock A</Chip>
            </div>
            <LocationInput
              value={pickup}
              onChange={setPickup}
              onSelect={(c) => setCoords((p) => ({ ...p, pickup: c }))}
              placeholder="e.g. Oklahoma City, OK"
              rightSlot={
                <span className="text-2xs text-slate-500 whitespace-nowrap">
                  Est. 1h on-duty
                </span>
              }
            />
          </div>
        </div>

        <div className="flex gap-3">
          <div className="flex flex-col items-center pt-6">
            <span className="relative z-10 w-6 h-6 rounded-full bg-emerald-500 text-white text-2xs font-bold flex items-center justify-center">
              3
            </span>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="label-xs">Dropoff Location</span>
              <Chip tone="neutral">Consignee</Chip>
            </div>
            <LocationInput
              value={dropoff}
              onChange={setDropoff}
              onSelect={(c) => setCoords((p) => ({ ...p, dropoff: c }))}
              placeholder="e.g. Denver, CO"
              rightSlot={
                <span className="text-2xs text-slate-500 whitespace-nowrap">
                  Est. 1h on-duty
                </span>
              }
            />
          </div>
        </div>
      </div>

      <div className="mt-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Clock size={14} className="text-slate-400" />
            <span className="text-sm font-medium text-navy">
              Current Cycle Used (Hours)
            </span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-lg font-bold text-navy">{cycleUsed}.0</span>
            <span className="text-xs text-slate-500">hrs ·</span>
            <span className="text-xs font-semibold text-emerald-600">
              {cycleRemaining}.0 hrs remaining
            </span>
          </div>
        </div>
        <input
          type="range"
          min={0}
          max={70}
          step={1}
          value={cycleUsed}
          onChange={(e) => setCycleUsed(Number(e.target.value))}
          className="w-full accent-brand"
        />
        <div className="flex justify-between text-2xs text-slate-500 mt-1.5">
          <span>0.0h (Fresh Cycle)</span>
          <span>35.0h Midpoint</span>
          <span>70.0h (Max Cap)</span>
        </div>
      </div>

      {error && (
        <div className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="mt-5 flex gap-3">
        <Button
          size="lg"
          onClick={onSubmit}
          disabled={!canSubmit}
          className="flex-1"
          leftIcon={
            loading ? (
              <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            ) : (
              <RouteIcon size={16} />
            )
          }
        >
          {loading ? "Generating route & logs…" : "Generate Route & Logs"}
        </Button>
        <Button
          size="lg"
          variant="secondary"
          onClick={clearForm}
          disabled={loading}
        >
          Clear Form
        </Button>
      </div>

      <div className="mt-6 pt-5 border-t border-slate-200">
        <p className="label-xs mb-3">
          Automated Dispatch Assumptions · Standard FMCSA 49 CFR § 395 Configuration
        </p>
        <div className="flex flex-wrap gap-2">
          <Chip tone="neutral" icon={<Calendar size={12} />}>
            70 hrs / 8 days rule
          </Chip>
          <Chip tone="neutral" icon={<Fuel size={12} />}>
            Fuel every 1,000 mi
          </Chip>
          <Chip tone="neutral" icon={<UserCheck size={12} />}>
            1 hr pickup on-duty
          </Chip>
          <Chip tone="neutral" icon={<UserCheck size={12} />}>
            1 hr drop-off on-duty
          </Chip>
        </div>
      </div>
    </Card>
  );
}