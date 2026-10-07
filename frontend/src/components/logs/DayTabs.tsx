import type { TripDailyLog } from "../../lib/types";

interface Props {
  days: TripDailyLog[];
  activeIdx: number;
  onChange: (i: number) => void;
}

function shortDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function DayTabs({ days, activeIdx, onChange }: Props) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1 -mb-1">
      {days.map((d, i) => {
        const duty =
          (d.totals.driving || 0) + (d.totals.on_duty_not_driving || 0);
        const active = i === activeIdx;
        return (
          <button
            key={d.date}
            onClick={() => onChange(i)}
            className={`shrink-0 px-4 py-2.5 rounded-lg border text-left transition-all ${
              active
                ? "bg-brand-subtle border-brand/30 shadow-card"
                : "bg-white border-slate-200 hover:border-slate-300"
            }`}
          >
            <div className="flex items-center gap-2">
              <span
                className={`w-2 h-2 rounded-full ${
                  active ? "bg-brand" : "bg-slate-300"
                }`}
              />
              <span
                className={`text-xs font-semibold whitespace-nowrap ${
                  active ? "text-navy" : "text-slate-700"
                }`}
              >
                Day {i + 1}: {shortDate(d.date)}
              </span>
            </div>
            <div
              className={`text-2xs mt-0.5 ${
                active ? "text-brand font-semibold" : "text-slate-500"
              }`}
            >
              {duty.toFixed(2)}h Duty
            </div>
          </button>
        );
      })}
    </div>
  );
}