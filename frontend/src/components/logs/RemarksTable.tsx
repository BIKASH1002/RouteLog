import type { SegmentStatus, TripDailyLogEntry } from "../../lib/types";

interface Props {
  entries: TripDailyLogEntry[];
}

const STATUS_LABEL: Record<SegmentStatus, string> = {
  off_duty: "OFF DUTY",
  sleeper: "SLEEPER",
  driving: "DRIVING",
  on_duty_not_driving: "ON-DUTY",
};

const STATUS_COLOR: Record<SegmentStatus, string> = {
  off_duty: "#94A3B8",
  sleeper: "#7C3AED",
  driving: "#2563EB",
  on_duty_not_driving: "#F59E0B",
};

function fmtHour(h: number): string {
  const hh = Math.floor(h);
  const mm = Math.round((h - hh) * 60);
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

function fmtMiles(m: number): string {
  return m.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

function locationFor(e: TripDailyLogEntry): string {
  if (e.start_miles === 0) return "Trip Origin";
  if (e.status === "driving") return `En route · Mile ${fmtMiles(e.start_miles)}`;
  if (e.note && e.note.toLowerCase().includes("pickup"))
    return `Pickup Dock · Mile ${fmtMiles(e.start_miles)}`;
  if (e.note && e.note.toLowerCase().includes("dropoff"))
    return `Dropoff Dock · Mile ${fmtMiles(e.start_miles)}`;
  if (e.note && e.note.toLowerCase().includes("fuel"))
    return `Fuel Stop · Mile ${fmtMiles(e.start_miles)}`;
  return `Mile ${fmtMiles(e.start_miles)}`;
}

export function RemarksTable({ entries }: Props) {
  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-200">
        <div className="text-sm font-bold text-navy">
          Remarks &amp; Duty Change Annotations
        </div>
        <div className="text-2xs text-slate-500">
          FMCSA § 395.8(c) · {entries.length} entries
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-2xs uppercase tracking-wide text-slate-500 border-b border-slate-200 bg-white">
              <th className="text-left font-semibold px-4 py-2.5 w-[80px]">
                Time
              </th>
              <th className="text-left font-semibold px-3 py-2.5 w-[140px]">
                Status
              </th>
              <th className="text-left font-semibold px-3 py-2.5">
                Location / Geofence
              </th>
              <th className="text-right font-semibold px-3 py-2.5 w-[110px]">
                Odometer
              </th>
              <th className="text-left font-semibold px-3 py-2.5">
                Activity / Remarks
              </th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e, i) => (
              <tr
                key={i}
                className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/60"
              >
                <td className="px-4 py-2.5 font-semibold text-navy tabular-nums whitespace-nowrap">
                  {fmtHour(e.start_hour)}
                </td>
                <td className="px-3 py-2.5">
                  <span className="inline-flex items-center gap-1.5">
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ background: STATUS_COLOR[e.status] }}
                    />
                    <span className="font-semibold text-navy text-2xs tracking-wide">
                      {STATUS_LABEL[e.status]}
                    </span>
                  </span>
                </td>
                <td className="px-3 py-2.5 text-slate-600 truncate max-w-[280px]">
                  {locationFor(e)}
                </td>
                <td className="px-3 py-2.5 text-right text-slate-700 tabular-nums">
                  {fmtMiles(e.start_miles)} mi
                </td>
                <td className="px-3 py-2.5 text-slate-700">
                  {e.note || STATUS_LABEL[e.status]}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}