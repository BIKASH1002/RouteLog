type Tone =
  | "neutral"
  | "brand"
  | "success"
  | "warning"
  | "danger"
  | "info";

const tones: Record<Tone, string> = {
  neutral: "bg-slate-100 text-slate-700 border-slate-200",
  brand: "bg-brand-subtle text-brand border-brand/20",
  success: "bg-emerald-50 text-emerald-700 border-emerald-200",
  warning: "bg-amber-50 text-amber-700 border-amber-200",
  danger: "bg-red-50 text-red-700 border-red-200",
  info: "bg-sky-50 text-sky-700 border-sky-200",
};

interface Props {
  tone?: Tone;
  children: React.ReactNode;
  className?: string;
  icon?: React.ReactNode;
}

export function Chip({ tone = "neutral", children, className = "", icon }: Props) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 h-6 rounded-full border text-2xs font-medium uppercase tracking-wide ${tones[tone]} ${className}`}
    >
      {icon}
      {children}
    </span>
  );
}