import { Truck, Clock, Coffee, Moon } from "lucide-react";

const items = [
  { icon: <Truck size={16} />, label: "Max Driving", value: "11h 00m", sub: "Post 10h consecutive" },
  { icon: <Clock size={16} />, label: "Shift Window", value: "14h 00m", sub: "Consecutive duty window" },
  { icon: <Coffee size={16} />, label: "Rest Break", value: "30 min", sub: "Required within 8h drive" },
  { icon: <Moon size={16} />, label: "Reset Period", value: "34h 00m", sub: "Full cycle restart" },
];

export function MiniStatGrid() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {items.map((it) => (
        <div key={it.label} className="card card-pad">
          <div className="text-slate-400 mb-2">{it.icon}</div>
          <div className="label-xs mb-1">{it.label}</div>
          <div className="text-xl font-bold text-navy">{it.value}</div>
          <div className="text-2xs text-slate-500 mt-1">{it.sub}</div>
        </div>
      ))}
    </div>
  );
}