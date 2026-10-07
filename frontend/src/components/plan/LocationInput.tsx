import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { MapPin } from "lucide-react";
import { geocodeLookup } from "../../lib/api";
import type { GeocodeCandidate } from "../../lib/types";

interface Props {
  value: string;
  onChange: (value: string) => void;
  onSelect: (c: GeocodeCandidate) => void;
  placeholder?: string;
  rightSlot?: React.ReactNode;
}

export function LocationInput({
  value,
  onChange,
  onSelect,
  placeholder,
  rightSlot,
}: Props) {
  const [open, setOpen] = useState(false);
  const [candidates, setCandidates] = useState<GeocodeCandidate[]>([]);
  const [loading, setLoading] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [locked, setLocked] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  // Debounced autocomplete
  useEffect(() => {
    if (locked) return;
    if (!value || value.trim().length < 3) {
      setCandidates([]);
      setOpen(false);
      return;
    }
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await geocodeLookup(value.trim());
        if (res.success) {
          setCandidates(res.data.candidates);
          setOpen(res.data.candidates.length > 0);
          setHighlight(0);
        }
      } catch {
        /* swallow — leave previous suggestions */
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [value, locked]);

  // Click outside closes dropdown
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const pick = (c: GeocodeCandidate) => {
    setLocked(true);
    onChange(c.label);
    onSelect(c);
    setOpen(false);
    setCandidates([]);
  };

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!open || candidates.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, candidates.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      pick(candidates[highlight]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  const handleChange = (v: string) => {
    setLocked(false);
    onChange(v);
  };

  return (
    <div ref={boxRef} className="relative">
      <div className="flex items-center gap-2 w-full h-12 px-3 bg-slate-50 border border-slate-200 rounded-lg focus-within:border-brand focus-within:bg-white focus-within:ring-2 focus-within:ring-brand/15 transition-all">
        <MapPin
          size={16}
          className={locked ? "text-emerald-500" : "text-slate-400"}
        />
        <input
          type="text"
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => candidates.length > 0 && setOpen(true)}
          onKeyDown={onKey}
          placeholder={placeholder}
          className="flex-1 bg-transparent border-0 outline-none text-sm text-navy placeholder:text-slate-400"
        />
        {loading && (
          <div className="w-3 h-3 border-2 border-slate-300 border-t-brand rounded-full animate-spin" />
        )}
        {rightSlot && !loading && <div className="shrink-0">{rightSlot}</div>}
      </div>

      {open && candidates.length > 0 && (
        <div className="absolute z-30 left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-lg shadow-pop overflow-hidden">
          {candidates.map((c, i) => (
            <button
              key={`${c.label}-${i}`}
              type="button"
              onClick={() => pick(c)}
              onMouseEnter={() => setHighlight(i)}
              className={`w-full text-left px-3.5 py-2.5 text-sm flex items-center gap-2.5 transition-colors ${
                i === highlight
                  ? "bg-brand-subtle text-navy"
                  : "text-slate-700 hover:bg-slate-50"
              }`}
            >
              <MapPin size={14} className="text-slate-400 shrink-0" />
              <span className="truncate">{c.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}