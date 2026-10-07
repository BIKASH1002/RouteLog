import { useState } from "react";
import { Sparkles, RotateCcw } from "lucide-react";
import { Button } from "../components/ui/Button";
import { RouteConfigForm } from "../components/plan/RouteConfigForm";
import { MiniStatGrid } from "../components/plan/MiniStatGrid";
import { RouteTrajectoryPreview } from "../components/plan/RouteTrajectoryPreview";
import { Toast } from "../components/ui/Toast";
import { useTrip } from "../context/TripContext";
import type { Trip } from "../lib/types";

const SAMPLE = {
  current: "Dallas, TX",
  pickup: "Oklahoma City, OK",
  dropoff: "Denver, CO",
  cycle: 24,
};

export default function PlanTripPage() {
  const { trip, setTrip } = useTrip();
  const [prefillKey, setPrefillKey] = useState(0);
  const [prefillData, setPrefillData] = useState<typeof SAMPLE | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const handlePlanned = (t: Trip) => {
    setTrip(t);
    setToast("Route computed and HOS plan generated.");
    setTimeout(() => setToast(null), 4200);
  };

  const handleSample = () => {
    setPrefillData(SAMPLE);
    setPrefillKey((k) => k + 1);
  };

  const handleRestore = () => {
    const raw = localStorage.getItem("routelog.trip");
    if (!raw) {
      setToast("No saved trip found in this browser.");
      setTimeout(() => setToast(null), 3200);
      return;
    }
    try {
      setTrip(JSON.parse(raw));
      setToast("Last trip restored.");
      setTimeout(() => setToast(null), 3200);
    } catch {
      setToast("Saved trip could not be read.");
      setTimeout(() => setToast(null), 3200);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-6">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 mb-3 px-3 h-7 rounded-full bg-brand-subtle border border-brand/20">
            <span className="w-1.5 h-1.5 rounded-full bg-brand" />
            <span className="text-2xs font-semibold tracking-wider text-brand uppercase">
              HOS Rules Engine · 49 CFR § 395.8 · Property-Carrying CMV
            </span>
          </div>
          <h1 className="text-[34px] font-bold text-navy leading-tight">
            Plan your route. Stay compliant.
          </h1>
          <p className="text-slate-500 mt-2.5 text-[15px]">
            Automated trip planning and FMCSA daily log generation for
            property-carrying drivers.
          </p>
        </div>
        <div className="hidden md:flex items-center gap-2 shrink-0 pt-3">
          <Button
            variant="secondary"
            size="md"
            leftIcon={<Sparkles size={14} />}
            onClick={handleSample}
          >
            Load Sample Trip
          </Button>
          <Button
            variant="secondary"
            size="md"
            leftIcon={<RotateCcw size={14} />}
            onClick={handleRestore}
          >
            Restore Last Trip
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <RouteConfigForm
            key={prefillKey}
            initialValues={prefillData}
            onPlanned={handlePlanned}
          />
          <MiniStatGrid />
        </div>
        <div className="space-y-6">
          <RouteTrajectoryPreview trip={trip} />
        </div>
      </div>

      {toast && (
        <Toast
          title="RouteLog"
          description={toast}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}