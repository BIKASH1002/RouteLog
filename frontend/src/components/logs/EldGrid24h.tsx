import type { SegmentStatus, TripDailyLogEntry } from "../../lib/types";

interface Props {
  entries: TripDailyLogEntry[];
  totals: Record<SegmentStatus, number>;
  remarks: { time: number; status: SegmentStatus; note: string }[];
}

const SVG_W = 1080;
const SVG_H = 520;
const LABEL_W = 175;
const RIGHT_W = 95;
const GRID_LEFT = LABEL_W;
const GRID_RIGHT = SVG_W - RIGHT_W;
const GRID_W = GRID_RIGHT - GRID_LEFT;
const HOUR_W = GRID_W / 24;
const GRID_TOP = 70;
const ROW_H = 88;
const GRID_BOTTOM = GRID_TOP + 4 * ROW_H;
const HOUR_LABEL_Y = 42;
const RULER_Y = 55;
const FOOTER_RULER_Y = GRID_BOTTOM + 22;
const ANNOTATION_END_Y = GRID_BOTTOM + 14;
const ANNOTATION_LABEL_Y = GRID_BOTTOM + 32;

const ROW_ORDER: SegmentStatus[] = [
  "off_duty",
  "sleeper",
  "driving",
  "on_duty_not_driving",
];

const ROW_LABEL: Record<SegmentStatus, string> = {
  off_duty: "1. OFF DUTY",
  sleeper: "2. SLEEPER BERTH",
  driving: "3. DRIVING",
  on_duty_not_driving: "4. ON-DUTY (NOT DRIVING)",
};

const ROW_BG: Record<SegmentStatus, string> = {
  off_duty: "#FBBF24",
  sleeper: "#FACC15",
  driving: "#60A5FA",
  on_duty_not_driving: "#4ADE80",
};

const ROW_LABEL_COLOR: Record<SegmentStatus, string> = {
  off_duty: "#B45309",
  sleeper: "#A16207",
  driving: "#1D4ED8",
  on_duty_not_driving: "#15803D",
};


function rowCenterY(status: SegmentStatus): number {
  const i = ROW_ORDER.indexOf(status);
  return GRID_TOP + i * ROW_H + ROW_H / 2;
}

function hourLabel(h: number): string {
  if (h === 0 || h === 24) return "Mid";
  if (h === 12) return "Noon";
  return String(h <= 12 ? h : h - 12);
}

function formatHour(h: number): string {
  const hh = Math.floor(h);
  const mm = Math.round((h - hh) * 60);
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

function shortNote(note: string): string {
  if (!note) return "";
  const n = note.toLowerCase();
  if (n.includes("pickup")) return "Pickup";
  if (n.includes("dropoff")) return "Dropoff";
  if (n.includes("fuel")) return "Fuel";
  if (n.includes("restart")) return "34h Restart";
  if (n.includes("reset")) return "Reset";
  if (n.includes("break")) return "Break";
  return note.length > 14 ? note.slice(0, 12) + "…" : note;
}

function selectAnnotations(
  remarks: { time: number; status: SegmentStatus; note: string }[]
) {
  const priority = (note: string) => {
    const n = (note || "").toLowerCase();
    if (n.includes("pickup")) return 1;
    if (n.includes("dropoff")) return 2;
    if (n.includes("fuel")) return 3;
    if (n.includes("restart")) return 4;
    if (n.includes("reset")) return 5;
    if (n.includes("break")) return 6;
    return 7;
  };
  const picked = [...remarks]
    .filter((r) => r.note && r.note.trim().length > 0)
    .sort((a, b) => priority(a.note) - priority(b.note))
    .slice(0, 5)
    .sort((a, b) => a.time - b.time);

  // Prevent visual collisions: keep at most one label per 1.5-hour window.
  const filtered: typeof picked = [];
  for (const r of picked) {
    if (
      filtered.length === 0 ||
      r.time - filtered[filtered.length - 1].time >= 1.4
    ) {
      filtered.push(r);
    }
  }
  return filtered.slice(0, 4);
}

function buildSteppedPath(entries: TripDailyLogEntry[]): string {
  const parts: string[] = [];
  let prevY: number | null = null;
  for (const e of entries) {
    if (!Number.isFinite(e.start_hour) || !Number.isFinite(e.end_hour)) continue;
    const y = rowCenterY(e.status);
    const x1 = GRID_LEFT + e.start_hour * HOUR_W;
    const x2 = GRID_LEFT + e.end_hour * HOUR_W;
    if (x2 - x1 <= 0.01) continue;
    if (prevY !== null && Math.abs(prevY - y) > 0.5) {
      parts.push(`M ${x1.toFixed(2)} ${prevY.toFixed(2)} L ${x1.toFixed(2)} ${y.toFixed(2)}`);
    }
    parts.push(`M ${x1.toFixed(2)} ${y.toFixed(2)} L ${x2.toFixed(2)} ${y.toFixed(2)}`);
    prevY = y;
  }
  return parts.join(" ");
}

export function EldGrid24h({ entries, totals, remarks }: Props) {
  const steppedPath = buildSteppedPath(entries);
  const annotations = selectAnnotations(remarks);

  return (
    <div className="w-full">
      <svg
        viewBox={`0 0 ${SVG_W} ${SVG_H}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ width: "100%", height: "auto", display: "block" }}
        fontFamily="Inter, system-ui, -apple-system, sans-serif"
      >
        {/* ---------- Ruler header ---------- */}
        <text
          x={GRID_LEFT}
          y={HOUR_LABEL_Y - 14}
          fontSize="10"
          fontWeight="600"
          fill="#64748B"
          letterSpacing="0.5"
        >
          24-HOUR DUTY STATUS GRAPH · 15-MIN SUB-DIVISIONS
        </text>
        <line
          x1={GRID_LEFT}
          y1={RULER_Y}
          x2={GRID_RIGHT}
          y2={RULER_Y}
          stroke="#94A3B8"
          strokeWidth="1"
        />
        {Array.from({ length: 25 }).map((_, h) => {
          const x = GRID_LEFT + h * HOUR_W;
          const isMajor = h % 6 === 0;
          const tickH = isMajor ? 12 : 7;
          return (
            <g key={`tick-${h}`}>
              <line
                x1={x}
                y1={RULER_Y}
                x2={x}
                y2={RULER_Y + tickH}
                stroke="#94A3B8"
              />
              <text
                x={x}
                y={HOUR_LABEL_Y}
                fontSize="10"
                fontWeight={isMajor ? "700" : "500"}
                fill={isMajor ? "#0F172A" : "#64748B"}
                textAnchor="middle"
              >
                {hourLabel(h)}
              </text>
            </g>
          );
        })}

        {/* ---------- Row backgrounds ---------- */}
        {ROW_ORDER.map((status, i) => {
          const y = GRID_TOP + i * ROW_H;
          return (
            <rect
              key={`bg-${status}`}
              x={GRID_LEFT}
              y={y}
              width={GRID_W}
              height={ROW_H}
              fill={ROW_BG[status]}
            />
          );
        })}

        {/* ---------- 15-minute sub-gridlines ---------- */}
        {Array.from({ length: 24 * 4 + 1 }).map((_, i) => {
          const h = i / 4;
          const isHour = i % 4 === 0;
          const x = GRID_LEFT + h * HOUR_W;
          return (
            <line
              key={`sub-${i}`}
              x1={x}
              y1={GRID_TOP}
              x2={x}
              y2={GRID_BOTTOM}
              stroke="#0F172A"
              strokeOpacity={isHour ? 0.18 : 0.05}
              strokeWidth={isHour ? 0.9 : 0.5}
            />
          );
        })}

        {/* ---------- Row separators ---------- */}
        {Array.from({ length: 5 }).map((_, i) => {
          const y = GRID_TOP + i * ROW_H;
          return (
            <line
              key={`sep-${i}`}
              x1={GRID_LEFT}
              y1={y}
              x2={GRID_RIGHT}
              y2={y}
              stroke="#0F172A"
              strokeOpacity="0.25"
              strokeWidth="1"
            />
          );
        })}

        {/* ---------- Left labels ---------- */}
        {ROW_ORDER.map((status) => {
          const cy = rowCenterY(status);
          return (
            <text
              key={`lbl-${status}`}
              x={16}
              y={cy + 5}
              fontSize="12"
              fontWeight="700"
              fill={ROW_LABEL_COLOR[status]}
              letterSpacing="0.3"
            >
              {ROW_LABEL[status]}
            </text>
          );
        })}

        {/* ---------- Right totals ---------- */}
        <line
          x1={GRID_RIGHT + 10}
          y1={GRID_TOP}
          x2={GRID_RIGHT + 10}
          y2={GRID_BOTTOM}
          stroke="#CBD5E1"
        />
        <text
          x={GRID_RIGHT + 30}
          y={HOUR_LABEL_Y}
          fontSize="10"
          fontWeight="700"
          fill="#64748B"
          letterSpacing="0.5"
        >
          HRS
        </text>
        {ROW_ORDER.map((status) => {
          const cy = rowCenterY(status);
          const v = totals[status] ?? 0;
          return (
            <text
              key={`tot-${status}`}
              x={GRID_RIGHT + 22}
              y={cy + 5}
              fontSize="14"
              fontWeight="700"
              fill={ROW_LABEL_COLOR[status]}
              fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
            >
              {v.toFixed(2)}
            </text>
          );
        })}

        {/* ---------- The stepped black line ---------- */}
        <path
          d={steppedPath}
          fill="none"
          stroke="#0F172A"
          strokeWidth="2.4"
          strokeLinejoin="miter"
          strokeLinecap="square"
        />

        {/* ---------- Footnote ruler (mirrors top) ---------- */}
        <line
          x1={GRID_LEFT}
          y1={FOOTER_RULER_Y}
          x2={GRID_RIGHT}
          y2={FOOTER_RULER_Y}
          stroke="#94A3B8"
        />
        {Array.from({ length: 24 * 4 + 1 }).map((_, i) => {
          if (i % 4 !== 0) return null;
          const h = i / 4;
          const x = GRID_LEFT + h * HOUR_W;
          const isMajor = h % 6 === 0;
          const tickH = isMajor ? 10 : 6;
          return (
            <line
              key={`ftick-${i}`}
              x1={x}
              y1={FOOTER_RULER_Y}
              x2={x}
              y2={FOOTER_RULER_Y - tickH}
              stroke="#94A3B8"
            />
          );
        })}
        {Array.from({ length: 25 }).map((_, h) => {
          const x = GRID_LEFT + h * HOUR_W;
          return (
            <text
              key={`flbl-${h}`}
              x={x}
              y={FOOTER_RULER_Y + 16}
              fontSize="10"
              fontWeight={h % 6 === 0 ? "700" : "500"}
              fill={h % 6 === 0 ? "#0F172A" : "#64748B"}
              textAnchor="middle"
            >
              {hourLabel(h)}
            </text>
          );
        })}

        {/* ---------- Annotation lines + labels ---------- */}
        {annotations.map((a, i) => {
          const x = GRID_LEFT + a.time * HOUR_W;
          const yTop = rowCenterY(a.status);
          return (
            <g key={`ann-${i}`}>
              <line
                x1={x}
                y1={yTop}
                x2={x}
                y2={ANNOTATION_END_Y}
                stroke="#0F172A"
                strokeOpacity="0.35"
                strokeDasharray="3 3"
              />
              <text
                x={x}
                y={ANNOTATION_LABEL_Y}
                fontSize="10"
                fontWeight="600"
                fill="#334155"
                textAnchor="middle"
              >
                {formatHour(a.time)}
              </text>
              <text
                x={x}
                y={ANNOTATION_LABEL_Y + 12}
                fontSize="9"
                fontWeight="500"
                fill="#64748B"
                textAnchor="middle"
              >
                {shortNote(a.note)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}