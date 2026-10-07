interface Props {
  date: string;
  totalMilesToday: number;
  tripId: number;
}

function longDate(iso: string): string {
  const d = new Date(iso);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${mm}/${dd}/${yyyy}`;
}

export function LogSheetHeader({ date, totalMilesToday, tripId }: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pb-5 border-b border-slate-200">
      {/* Left */}
      <div>
        <div className="text-2xs font-bold uppercase tracking-wider text-brand mb-1.5">
          Form MCS-884 · 49 CFR § 395.8
        </div>
        <div className="text-xl font-bold text-navy leading-tight">
          Driver's Daily Log
          <span className="text-slate-400 font-normal ml-1.5 text-base">
            (24 Hours)
          </span>
        </div>
        <div className="text-2xs text-slate-500 mt-1.5 leading-relaxed">
          Original to carrier · True and correct automated record of duty
          status
        </div>
      </div>

      {/* Middle */}
      <div className="text-xs">
        <div className="grid grid-cols-2 gap-x-4 gap-y-3">
          <div>
            <div className="label-xs mb-0.5">Date (MM/DD/YYYY)</div>
            <div className="font-semibold text-navy tabular-nums">
              {longDate(date)}
            </div>
          </div>
          <div>
            <div className="label-xs mb-0.5">Total Miles Driving</div>
            <div className="font-semibold text-navy tabular-nums">
              {totalMilesToday.toFixed(0)} mi
            </div>
          </div>
          <div>
            <div className="label-xs mb-0.5">Co-Driver</div>
            <div className="text-slate-700">None / Solo Operator</div>
          </div>
          <div>
            <div className="label-xs mb-0.5">Trip Ref</div>
            <div className="font-semibold text-navy tabular-nums">
              #RL-{String(tripId).padStart(4, "0")}
            </div>
          </div>
        </div>
      </div>

      {/* Right */}
      <div className="text-xs md:text-right">
        <div className="text-sm font-bold text-navy">
          RouteLog Demo Carrier
        </div>
        <div className="text-slate-500 mt-0.5 leading-relaxed">
          Home Operating Center
          <br />
          1 Compliance Way, Green Bay, WI
          <br />
          USDOT #000000 · MC #000000
        </div>
      </div>
    </div>
  );
}