import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { FileText } from "lucide-react";
import { useTrip } from "../context/TripContext";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { DayTabs } from "../components/logs/DayTabs";
import { EldGrid24h } from "../components/logs/EldGrid24h";
import { LogSheetHeader } from "../components/logs/LogSheetHeader";
import { RemarksTable } from "../components/logs/RemarksTable";
import { CycleRecapCard } from "../components/logs/CycleRecapCard";
import { RuleSafetyCard } from "../components/logs/RuleSafetyCard";
import { CertificationBlock } from "../components/logs/CertificationBlock";

function EmptyLogs() {
  return (
    <Card>
      <div className="text-center py-14">
        <div className="w-14 h-14 rounded-full bg-brand-subtle text-brand flex items-center justify-center mx-auto mb-4">
          <FileText size={24} />
        </div>
        <h2 className="text-lg font-bold text-navy mb-1">No daily logs yet</h2>
        <p className="text-sm text-slate-500 max-w-md mx-auto mb-6">
          Plan a trip first — once generated, the FMCSA daily log sheets will
          appear here.
        </p>
        <Link to="/">
          <Button size="lg">Plan a Trip</Button>
        </Link>
      </div>
    </Card>
  );
}

export default function DailyLogPage() {
  const { trip } = useTrip();
  const [activeIdx, setActiveIdx] = useState(0);

  const day = useMemo(() => {
    if (!trip) return null;
    return trip.plan.daily_logs[activeIdx] ?? trip.plan.daily_logs[0];
  }, [trip, activeIdx]);

  const totalMilesToday = useMemo(() => {
    if (!day) return 0;
    const first = day.entries[0];
    const last = day.entries[day.entries.length - 1];
    if (!first || !last) return 0;
    return Math.max(0, last.end_miles - first.start_miles);
  }, [day]);

  if (!trip || !day) {
    return (
      <div className="space-y-6">
        <div>
          <div className="inline-flex items-center gap-2 mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-brand" />
            <span className="text-2xs font-semibold tracking-wider text-brand uppercase">
              Hours of Service · Records
            </span>
          </div>
          <h1 className="text-3xl font-bold text-navy">Daily Log Sheets</h1>
        </div>
        <EmptyLogs />
      </div>
    );
  }

  const totalDays = trip.plan.daily_logs.length;

  return (
    <div className="space-y-6">
      <div>
        <div className="inline-flex items-center gap-2 mb-2">
          <span className="w-1.5 h-1.5 rounded-full bg-brand" />
          <span className="text-2xs font-semibold tracking-wider text-brand uppercase">
            Hours of Service · Records
          </span>
        </div>
        <h1 className="text-3xl font-bold text-navy leading-tight">
          FMCSA § 395.8 Driver's Daily Log
        </h1>
        <p className="text-slate-500 mt-1.5 text-sm">
          Showing Day {activeIdx + 1} of {totalDays} · 70-hr / 8-day ·
          Property-Carrying CMV
        </p>
      </div>

      <DayTabs
        days={trip.plan.daily_logs}
        activeIdx={activeIdx}
        onChange={setActiveIdx}
      />

      <div className="grid grid-cols-1 xl:grid-cols-[1.75fr_1fr] gap-6">
        <div className="card card-pad space-y-5">
          <LogSheetHeader
            date={day.date}
            totalMilesToday={totalMilesToday}
            tripId={trip.trip_id}
          />

          <EldGrid24h
            entries={day.entries}
            totals={day.totals}
            remarks={day.remarks}
          />

          <RemarksTable entries={day.entries} />

          <CertificationBlock tripId={trip.trip_id} date={day.date} />
        </div>

        <div className="space-y-6">
          <CycleRecapCard day={day} segments={trip.plan.segments} />
          <RuleSafetyCard day={day} />
        </div>
      </div>
    </div>
  );
}