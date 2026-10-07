import { NavLink } from "react-router-dom";
import { UserCircle2 } from "lucide-react";
import logo from "../../assets/logo.png";
import { StatusDot } from "../ui/StatusDot";
import { useTrip } from "../../context/TripContext";

const links = [
  { to: "/", label: "Plan Trip" },
  { to: "/results", label: "Trip Results" },
  { to: "/logs", label: "Daily Log Sheets" },
  { to: "/rules", label: "Compliance Rules" },
];

export function TopNav() {
  const { trip } = useTrip();

  const cycleRemaining = (() => {
    if (!trip || !trip.plan.daily_logs.length) return 70;
    const last = trip.plan.daily_logs[trip.plan.daily_logs.length - 1];
    return Math.max(0, last.cycle_remaining);
  })();

  const cycleTone: "success" | "warning" | "danger" =
    cycleRemaining > 20 ? "success" : cycleRemaining > 5 ? "warning" : "danger";

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200">
      <div className="max-w-[1400px] mx-auto px-6 h-16 flex items-center gap-8">
        <NavLink to="/" className="flex items-center gap-2.5 shrink-0">
          <img src={logo} alt="RouteLog" className="h-9 w-auto" />
        </NavLink>

        <nav className="flex items-center gap-1">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) =>
                `px-3.5 py-2 text-sm font-medium rounded-lg transition-colors ${
                  isActive
                    ? "bg-brand text-white"
                    : "text-slate-600 hover:text-navy hover:bg-slate-100"
                }`
              }
            >
              {l.label}
            </NavLink>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-4">
          <div className="hidden md:flex items-center gap-2 px-3 h-9 rounded-full bg-slate-100 border border-slate-200">
            <StatusDot tone={cycleTone} pulse={cycleTone !== "success"} />
            <span className="text-xs font-medium text-slate-700">
              {cycleRemaining.toFixed(1)} hr cycle remaining
            </span>
          </div>
          <div className="flex items-center gap-2 pl-3 border-l border-slate-200">
            <UserCircle2 size={28} className="text-slate-400" />
            <div className="leading-tight hidden sm:block">
              <div className="text-xs font-semibold text-navy">Demo Driver</div>
              <div className="text-2xs text-slate-500">CDL-A · Carrier Demo</div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}