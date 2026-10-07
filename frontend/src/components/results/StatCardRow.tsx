import { Truck, Clock, Timer, FileText } from "lucide-react";
import type { Trip } from "../../lib/types";
import { formatHours } from "../../lib/format";

interface Props {
  trip: Trip;
}

interface CardSpec {
  icon: React.ReactNode;
  label: string;
  value: string;
  unit?: string;
  sub: string;
  subTone: "brand" | "success" | "slate";
}

export function StatCardRow({ trip }: Props) {
  const s = trip.plan.summary;
  const avgSpeed = s.driving_hours > 0 ? s.total_miles / s.driving_hours : 0;

  const cards: CardSpec[] = [
    {
      icon: <Truck size={16} />,
      label: "Total Distance",
      value: s.total_miles.toFixed(0),
      unit: "mi",
      sub: `${trip.current_location} → ${trip.dropoff_location}`,
      subTone: "brand",
    },
    {
      icon: <Clock size={16} />,
      label: "Est. Driving Time",
      value: formatHours(s.driving_hours),
      sub: `Avg ${avgSpeed.toFixed(0)} mph highway pace`,
      subTone: "success",
    },
    {
      icon: <Timer size={16} />,
      label: "Trip Elapsed Span",
      value: formatHours(s.total_hours),
      sub: "Includes 10h sleeper + breaks",
      subTone: "brand",
    },
    {
      icon: <FileText size={16} />,
      label: "Daily Log Sheets",
      value: `${s.days}`,
      unit: s.days === 1 ? "Day" : "Days",
      sub: `${s.days} auto-generated ${s.days === 1 ? "grid" : "grids"} (Pass)`,
      subTone: "slate",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((c) => (
        <div key={c.label} className="card card-pad">
          <div className="flex items-center justify-between mb-3">
            <div className="label-xs">{c.label}</div>
            <div className="w-8 h-8 rounded-md bg-brand-subtle text-brand flex items-center justify-center">
              {c.icon}
            </div>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-[30px] leading-none font-bold text-navy tracking-tight">
              {c.value}
            </span>
            {c.unit && <span className="text-sm text-slate-500">{c.unit}</span>}
          </div>
          <div
            className={`text-2xs mt-2.5 font-medium ${
              c.subTone === "brand"
                ? "text-brand"
                : c.subTone === "success"
                ? "text-emerald-600"
                : "text-slate-500"
            }`}
          >
            {c.sub}
          </div>
        </div>
      ))}
    </div>
  );
}