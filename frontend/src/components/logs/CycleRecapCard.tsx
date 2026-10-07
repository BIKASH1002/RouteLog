import { RefreshCw } from "lucide-react";
import { Card } from "../ui/Card";
import { maxShiftDriving, maxShiftWindow } from "../../lib/hos";
import type { TripDailyLog, TripSegment } from "../../lib/types";

interface Props {
  day: TripDailyLog;
  segments: TripSegment[];
}

function getCycleNumber(segments: TripSegment[], dayDate: string): number {
  const restarts = segments.filter(
    (s) => s.status === "sleeper" && s.hours >= 33.9
  );
  const prior = restarts.filter((s) => s.end.slice(0, 10) < dayDate);
  return 1 + prior.length;
}

export function CycleRecapCard({ day, segments }: Props) {
  const remaining = day.cycle_remaining;
  const usedTotal = 70 - remaining;
  const usedPct = (usedTotal / 70) * 100;

  const dutyToday =
    (day.totals.driving || 0) + (day.totals.on_duty_not_driving || 0);

  const shiftDriving = maxShiftDriving(day.entries);
  const drivingRemaining = Math.max(0, 11 - shiftDriving);

  const windowUsed = maxShiftWindow(day.entries);
  const windowLeft = Math.max(0, 14 - windowUsed);

  const cycleNumber = getCycleNumber(segments, day.date);

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <RefreshCw size={14} className="text-brand" />
          <h3 className="text-[15px] font-semibold text-navy">
            70h / 8-Day Cycle Recap
          </h3>
        </div>
        <span className="text-2xs font-semibold text-brand">
          Cycle {cycleNumber}
        </span>
      </div>

      <div className="mb-4">
        <div className="label-xs mb-2">Cycle Hours Remaining</div>
        <div className="flex items-baseline gap-2 mb-2.5">
          <span className="text-3xl font-bold text-navy tabular-nums">
            {remaining.toFixed(1)}
          </span>
          <span className="text-sm text-slate-500">/ 70.0 h</span>
        </div>
        <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
          <div
            className="h-full bg-brand rounded-full transition-all"
            style={{ width: `${Math.min(100, usedPct)}%` }}
          />
        </div>
        <div className="flex justify-between text-2xs text-slate-500 mt-1.5">
          <span>{usedTotal.toFixed(1)}h used</span>
          <span>{remaining.toFixed(1)}h available</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 rounded-lg bg-brand-subtle border border-brand/10">
          <div className="label-xs mb-1">Duty Today</div>
          <div className="text-base font-bold text-navy tabular-nums">
            {dutyToday.toFixed(2)} hrs
          </div>
          <div className="text-2xs text-slate-500 mt-0.5">
            {(day.totals.driving || 0).toFixed(2)}h D +{" "}
            {(day.totals.on_duty_not_driving || 0).toFixed(2)}h On
          </div>
        </div>
        <div className="p-3 rounded-lg bg-brand-subtle border border-brand/10">
          <div className="label-xs mb-1">Driving Remaining</div>
          <div className="text-base font-bold text-navy tabular-nums">
            {drivingRemaining.toFixed(2)} hrs
          </div>
          <div className="text-2xs text-slate-500 mt-0.5">
            Longest shift · Max 11.00h
          </div>
        </div>
        <div className="p-3 rounded-lg bg-brand-subtle border border-brand/10">
          <div className="label-xs mb-1">14h Window</div>
          <div className="text-base font-bold text-navy tabular-nums">
            {windowUsed.toFixed(2)} hrs
          </div>
          <div className="text-2xs text-slate-500 mt-0.5">
            {windowLeft.toFixed(2)}h window left
          </div>
        </div>
        <div className="p-3 rounded-lg bg-brand-subtle border border-brand/10">
          <div className="label-xs mb-1">Rest Clock</div>
          <div className="text-base font-bold text-navy tabular-nums">
            {(day.totals.sleeper || 0).toFixed(2)} hrs
          </div>
          <div className="text-2xs text-slate-500 mt-0.5">
            Sleeper berth logged
          </div>
        </div>
      </div>
    </Card>
  );
}