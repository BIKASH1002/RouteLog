import { X } from "lucide-react";

interface Props {
  title: string;
  description?: string;
  onClose?: () => void;
}

export function Toast({ title, description, onClose }: Props) {
  return (
    <div className="fixed bottom-6 right-6 z-50 w-80 bg-navy text-white rounded-xl shadow-pop p-4 flex items-start gap-3">
      <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center shrink-0 mt-0.5">
        <svg viewBox="0 0 20 20" className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth="3">
          <path d="M5 10l3 3 7-7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <div className="flex-1">
        <p className="text-sm font-semibold leading-tight">{title}</p>
        {description && <p className="text-xs text-slate-300 mt-0.5">{description}</p>}
      </div>
      {onClose && (
        <button onClick={onClose} className="text-slate-400 hover:text-white">
          <X size={14} />
        </button>
      )}
    </div>
  );
}