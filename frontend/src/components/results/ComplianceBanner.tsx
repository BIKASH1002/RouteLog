import { ShieldCheck } from "lucide-react";

export function ComplianceBanner() {
  return (
    <div className="card card-pad flex items-center gap-3">
      <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
        <ShieldCheck size={20} />
      </div>
      <div>
        <div className="text-sm font-bold text-navy">No HOS Violations Detected</div>
        <div className="text-xs text-slate-500">
          Zero violations detected across all driving cycles.
        </div>
      </div>
    </div>
  );
}