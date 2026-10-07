type Tone = "success" | "warning" | "danger" | "brand" | "slate";

const tones: Record<Tone, string> = {
  success: "bg-emerald-500",
  warning: "bg-amber-500",
  danger: "bg-red-500",
  brand: "bg-brand",
  slate: "bg-slate-400",
};

export function StatusDot({ tone = "success", pulse = false, label }: { tone?: Tone; pulse?: boolean; label?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="relative flex w-2 h-2">
        {pulse && (
          <span
            className={`absolute inline-flex w-full h-full rounded-full opacity-60 animate-ping ${tones[tone]}`}
          />
        )}
        <span className={`relative inline-flex w-2 h-2 rounded-full ${tones[tone]}`} />
      </span>
      {label && <span className="text-xs text-slate-600">{label}</span>}
    </span>
  );
}