interface Props {
  children: React.ReactNode;
  className?: string;
  pad?: boolean;
}

export function Card({ children, className = "", pad = true }: Props) {
  return (
    <div className={`card ${pad ? "card-pad" : ""} ${className}`}>{children}</div>
  );
}

interface HeaderProps {
  icon?: React.ReactNode;
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}

export function CardHeader({ icon, title, subtitle, right }: HeaderProps) {
  return (
    <div className="flex items-start justify-between mb-4">
      <div className="flex items-start gap-2.5">
        {icon && (
          <div className="mt-0.5 w-7 h-7 rounded-md bg-brand-subtle text-brand flex items-center justify-center shrink-0">
            {icon}
          </div>
        )}
        <div>
          <h3 className="text-[15px] font-semibold text-navy leading-tight">{title}</h3>
          {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {right}
    </div>
  );
}