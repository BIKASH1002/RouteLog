import { CheckCircle2, ShieldCheck } from "lucide-react";
import { Card } from "../ui/Card";
import { Chip } from "../ui/Chip";
import { maxShiftDriving, maxShiftWindow } from "../../lib/hos";
import type { TripDailyLog } from "../../lib/types";

interface Props {
  day: TripDailyLog;
}

export function RuleSafetyCard({ day }: Props) {
  const shiftDriving = maxShiftDriving(day.entries);
  const shiftWindow = maxShiftWindow(day.entries);
  const offDuty = day.totals.off_duty || 0;

  const hasBreak = day.remarks.some((r) =>
    (r.note || "").toLowerCase().includes("break")
  );
  const hasReset =
    (day.totals.sleeper || 0) >= 9.9 ||
    day.remarks.some(
      (r) =>
        (r.note || "").toLowerCase().includes("reset") ||
        (r.note || "").toLowerCase().includes("restart")
    );

  const rules = [
    {
      title: "11-Hour Driving Limit",
      value: `${shiftDriving.toFixed(2)}h / 11.00h`,
      sub:
        shiftDriving <= 11.01
          ? "Complies with 49 CFR § 395.3(a)(3)(i)"
          : "Exceeds 11-hour limit",
      pass: shiftDriving <= 11.01,
    },
    {
      title: "14-Hour Consecutive Window",
      value: `${shiftWindow.toFixed(2)}h / 14.00h`,
      sub:
        shiftWindow <= 14.01
          ? "Duty shift completed within window"
          : "Window exceeded",
      pass: shiftWindow <= 14.01,
    },
    {
      title: "30-Minute Rest Break",
      value: hasBreak ? "Taken" : "Not required",
      sub: hasBreak
        ? "Completed after 8 cumulative driving hours"
        : "No 8-hour continuous drive reached",
      pass: true,
    },
    {
      title: "10-Hour Off-Duty Reset",
      value: hasReset ? "Recorded" : "Not required",
      sub: hasReset
        ? "10h consecutive rest satisfied"
        : "Not needed for this day",
      pass: true,
    },
  ];

  const allPass = rules.every((r) => r.pass);

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <ShieldCheck size={14} className="text-brand" />
          <h3 className="text-[15px] font-semibold text-navy">
            Rule Safety Verification
          </h3>
        </div>
        <Chip tone={allPass ? "success" : "danger"}>
          {allPass ? "All Passed" : "Violation"}
        </Chip>
      </div>

      <div className="space-y-2.5">
        {rules.map((r) => (
          <div
            key={r.title}
            className="flex items-start gap-2.5 p-2.5 rounded-lg border border-slate-200"
          >
            <CheckCircle2
              size={16}
              className={
                r.pass
                  ? "text-emerald-500 shrink-0 mt-0.5"
                  : "text-red-500 shrink-0 mt-0.5"
              }
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-3 mb-0.5">
                <span className="text-xs font-semibold text-navy">
                  {r.title}
                </span>
                <span className="text-2xs font-semibold text-slate-700 tabular-nums whitespace-nowrap">
                  {r.value}
                </span>
              </div>
              <p className="text-2xs text-slate-500 leading-relaxed">
                {r.sub}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 pt-3 border-t border-slate-200 text-2xs text-slate-500">
        Off-Duty logged today:{" "}
        <span className="font-semibold text-navy">{offDuty.toFixed(2)}h</span>
      </div>
    </Card>
  );
}