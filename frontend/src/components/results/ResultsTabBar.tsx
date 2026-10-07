import { useNavigate } from "react-router-dom";
import { Map as MapIcon, Grid3x3, Share2, Edit3 } from "lucide-react";
import { Button } from "../ui/Button";
import { StatusDot } from "../ui/StatusDot";

interface Props {
  activeTab: "map" | "logs";
  dayCount?: number;
}

export function ResultsTabBar({ activeTab, dayCount }: Props) {
  const navigate = useNavigate();

  const tabCls = (active: boolean) =>
    `inline-flex items-center gap-2 px-3.5 h-9 rounded-lg text-sm font-medium transition-colors ${
      active
        ? "bg-brand text-white"
        : "text-slate-600 hover:bg-slate-100 hover:text-navy"
    }`;

  return (
    <div className="flex items-center justify-between gap-4 flex-wrap">
      <div className="flex items-center gap-1 p-1 bg-white border border-slate-200 rounded-xl">
        <button
          className={tabCls(activeTab === "map")}
          onClick={() => navigate("/results")}
        >
          <MapIcon size={14} />
          Route Map &amp; Itinerary
        </button>
        <button
          className={tabCls(activeTab === "logs")}
          onClick={() => navigate("/logs")}
        >
          <Grid3x3 size={14} />
          Daily Log Sheets
          {dayCount !== undefined && (
            <span className="ml-1 text-2xs opacity-80">({dayCount})</span>
          )}
          {dayCount !== undefined && <StatusDot tone="success" />}
        </button>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="secondary"
          size="md"
          leftIcon={<Edit3 size={14} />}
          onClick={() => navigate("/")}
        >
          Edit Trip
        </Button>
        <Button
          variant="secondary"
          size="md"
          leftIcon={<Share2 size={14} />}
          onClick={() => {
            if (navigator.share) {
              navigator
                .share({
                  title: "RouteLog trip",
                  text: "Check out this HOS-planned trip on RouteLog.",
                  url: window.location.href,
                })
                .catch(() => {});
            } else {
              navigator.clipboard?.writeText(window.location.href);
            }
          }}
        >
          Share
        </Button>
      </div>
    </div>
  );
}