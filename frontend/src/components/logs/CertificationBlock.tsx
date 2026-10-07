interface Props {
  tripId: number;
  date: string;
}

export function CertificationBlock({ tripId, date }: Props) {
  return (
    <div className="p-4 rounded-lg border border-slate-200 bg-slate-50/60">
      <div className="label-xs mb-2">
        Driver's Certification (49 CFR § 395.8(f)(12))
      </div>
      <p className="text-xs text-slate-600 leading-relaxed mb-4">
        I hereby certify that my data entries and my record of duty status
        for this 24-hour period are true, complete, and correct.
      </p>
      <div className="border-b border-slate-300 pb-1.5 max-w-sm">
        <span className="text-sm font-semibold text-navy italic">
          Demo Driver
        </span>
      </div>
      <div className="text-2xs text-slate-500 mt-1">
        Trip #RL-{String(tripId).padStart(4, "0")} · {date}
      </div>
    </div>
  );
}