import { useMemo, useState } from "react";
import { Calendar, ChevronDown, ChevronRight } from "lucide-react";
import type { SegmentStatus, Trip, TripSegment } from "../../lib/types";
import { formatHours, formatTimeRange } from "../../lib/format";
import { Card } from "../ui/Card";
import { Chip } from "../ui/Chip";

interface Props {
  trip: Trip;
}

const STATUS_LABEL: Record<SegmentStatus, string> = {
  driving: "Driving",
  on_duty_not_driving: "On-Duty",
  sleeper: "Sleeper Berth",
  off_duty: "Off Duty",
};

const STATUS_TONE: Record<
  SegmentStatus,
  "success" | "warning" | "brand" | "neutral"
> = {
  driving: "success",
  on_duty_not_driving: "warning",
  sleeper: "brand",
  off_duty: "neutral",
};

interface DayGroup {
  dateKey: string;
  heading: string;
  totalMiles: number;
  totalHours: number;
  segments: TripSegment[];
}

function buildDayGroups(segments: TripSegment[]): DayGroup[] {
  const map = new Map<string, TripSegment[]>();
  segments.forEach((s) => {
    const key = s.start.slice(0, 10);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(s);
  });

  return Array.from(map.entries()).map(([key, segs], i) => {
    const milesDelta =
      segs.length > 0
        ? segs[segs.length - 1].end_miles - segs[0].start_miles
        : 0;
    const hours = segs.reduce((sum, s) => sum + s.hours, 0);
    return {
      dateKey: key,
      heading: `Day ${i + 1}`,
      totalMiles: milesDelta,
      totalHours: hours,
      segments: segs,
    };
  });
}

function SegmentRow({ seg }: { seg: TripSegment }) {
  const tone = STATUS_TONE[seg.status] ?? "neutral";
  const pillLabel = STATUS_LABEL[seg.status] ?? seg.status;
  const description = seg.note || STATUS_LABEL[seg.status];
  const milesDelta = seg.end_miles - seg.start_miles;

  return (
    <div className="relative pl-8 pb-5 last:pb-0">
      <span className="absolute left-[9px] top-1 bottom-0 w-px bg-slate-200 last:hidden" />
      <span
        className={`absolute left-0 top-1 w-[18px] h-[18px] rounded-full border-2 border-white shadow ${
          seg.status === "driving"
            ? "bg-emerald-500"
            : seg.status === "on_duty_not_driving"
            ? "bg-amber-500"
            : seg.status === "sleeper"
            ? "bg-purple-500"
            : "bg-slate-400"
        }`}
      />

      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-navy tabular-nums">
              {formatTimeRange(seg.start, seg.end)}
            </span>
            <Chip tone={tone}>{pillLabel}</Chip>
            {seg.status === "driving" && milesDelta > 0 && (
              <span className="text-2xs text-slate-500">
                {milesDelta.toFixed(0)} mi
              </span>
            )}
          </div>
          <div className="text-sm text-slate-700 mt-1 truncate">
            {description}
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-xs font-semibold text-navy tabular-nums">
            {formatHours(seg.hours)}
          </div>
          <div className="text-2xs text-slate-500">
            {seg.status === "driving" ? "continuous" : "duration"}
          </div>
        </div>
      </div>
    </div>
  );
}

export function RouteInstructionsTimeline({ trip }: Props) {
  const groups = useMemo(
    () => buildDayGroups(trip.plan.segments),
    [trip.plan.segments]
  );

  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const toggle = (key: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const allCollapsed = collapsed.size === groups.length;
  const toggleAll = () => {
    if (allCollapsed) setCollapsed(new Set());
    else setCollapsed(new Set(groups.map((g) => g.dateKey)));
  };

  const totalSegs = trip.plan.segments.length;

  return (
    <Card pad={false}>
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-md bg-brand-subtle text-brand flex items-center justify-center">
            <Calendar size={14} />
          </div>
          <div>
            <div className="text-sm font-semibold text-navy leading-tight">
              Route Instructions &amp; Stops
            </div>
            <div className="text-2xs text-slate-500">
              {totalSegs} segments · {groups.length}{" "}
              {groups.length === 1 ? "day" : "days"}
            </div>
          </div>
        </div>
        <button
          onClick={toggleAll}
          className="text-2xs text-brand font-medium hover:underline"
        >
          {allCollapsed ? "Expand all" : "Collapse all"}
        </button>
      </div>

      <div className="max-h-[720px] overflow-y-auto">
        {groups.map((g, gi) => {
          const isCollapsed = collapsed.has(g.dateKey);
          return (
            <div key={g.dateKey}>
              <button
                type="button"
                onClick={() => toggle(g.dateKey)}
                className="w-full flex items-center justify-between px-5 py-3 bg-slate-50 border-y border-slate-200 hover:bg-slate-100 transition-colors text-left"
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-slate-400">
                    {isCollapsed ? (
                      <ChevronRight size={14} />
                    ) : (
                      <ChevronDown size={14} />
                    )}
                  </span>
                  <div>
                    <div className="text-xs font-bold text-navy">
                      {g.heading}
                    </div>
                    <div className="text-2xs text-slate-500">{g.dateKey}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-semibold text-navy tabular-nums">
                    {g.totalMiles.toFixed(0)} mi · {formatHours(g.totalHours)}
                  </div>
                  <div className="text-2xs text-slate-500">span</div>
                </div>
              </button>

              {!isCollapsed && (
                <div className="px-5 pt-4 pb-1">
                  {g.segments.map((seg, i) => (
                    <SegmentRow key={`${gi}-${i}`} seg={seg} />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}