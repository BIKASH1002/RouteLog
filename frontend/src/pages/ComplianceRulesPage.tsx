import { ShieldCheck } from "lucide-react";
import { Card } from "../components/ui/Card";

export default function ComplianceRulesPage() {
  return (
    <div className="space-y-6">
      <div>
        <div className="inline-flex items-center gap-2 mb-2">
          <span className="w-1.5 h-1.5 rounded-full bg-brand" />
          <span className="text-2xs font-semibold tracking-wider text-brand uppercase">
            FMCSA HOS Reference
          </span>
        </div>
        <h1 className="text-3xl font-bold text-navy">Compliance Rules</h1>
        <p className="text-slate-500 mt-1.5 max-w-2xl">
          The 49 CFR § 395.3 rules the RouteLog engine enforces on every plan.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { title: "11-Hour Driving", body: "Max 11 cumulative hours driving after 10 consecutive hours off duty." },
          { title: "14-Hour Window", body: "No driving beyond 14 consecutive hours after coming on duty." },
          { title: "30-Minute Break", body: "Required after 8 cumulative hours driving without a 30-minute interruption." },
          { title: "10-Hour Reset", body: "Full 10 consecutive hours off duty resets the 11/14 clocks." },
          { title: "60/70-Hour Limit", body: "70 hours in any 8 consecutive days (property-carrying)." },
          { title: "34-Hour Restart", body: "34 consecutive hours off duty resets the 70-hour cycle." },
          { title: "Fuel Interval", body: "Fueling stops placed at least every 1,000 miles." },
          { title: "Pickup & Dropoff", body: "1 hour on-duty non-driving for pickup and dropoff each." },
        ].map((r) => (
          <Card key={r.title}>
            <div className="w-8 h-8 rounded-md bg-brand-subtle text-brand flex items-center justify-center mb-3">
              <ShieldCheck size={16} />
            </div>
            <h3 className="text-sm font-semibold text-navy mb-1">{r.title}</h3>
            <p className="text-xs text-slate-600 leading-relaxed">{r.body}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}