import { Link } from "react-router-dom";
import { Route } from "lucide-react";
import { useTrip } from "../context/TripContext";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { StatCardRow } from "../components/results/StatCardRow";
import { ResultsTabBar } from "../components/results/ResultsTabBar";
import { LightRouteMap } from "../components/results/LightRouteMap";
import { RouteInstructionsTimeline } from "../components/results/RouteInstructionsTimeline";
import { ComplianceBanner } from "../components/results/ComplianceBanner";

function EmptyResults() {
  return (
    <Card>
      <div className="text-center py-14">
        <div className="w-14 h-14 rounded-full bg-brand-subtle text-brand flex items-center justify-center mx-auto mb-4">
          <Route size={24} />
        </div>
        <h2 className="text-lg font-bold text-navy mb-1">
          No trip computed yet
        </h2>
        <p className="text-sm text-slate-500 max-w-md mx-auto mb-6">
          Plan a trip first — once generated, the results, route map, and HOS
          itinerary will appear here.
        </p>
        <Link to="/">
          <Button size="lg">Plan a Trip</Button>
        </Link>
      </div>
    </Card>
  );
}

export default function TripResultsPage() {
  const { trip } = useTrip();

  if (!trip) {
    return (
      <div className="space-y-6">
        <div>
          <div className="inline-flex items-center gap-2 mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-brand" />
            <span className="text-2xs font-semibold tracking-wider text-brand uppercase">
              Trip Results · HOS Itinerary
            </span>
          </div>
          <h1 className="text-3xl font-bold text-navy">Trip Results</h1>
        </div>
        <EmptyResults />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <StatCardRow trip={trip} />
      <ResultsTabBar activeTab="map" dayCount={trip.plan.daily_logs.length} />

      <div className="grid grid-cols-1 xl:grid-cols-[1.55fr_1fr] gap-6">
        <LightRouteMap trip={trip} />
        <RouteInstructionsTimeline trip={trip} />
      </div>

      <ComplianceBanner />
    </div>
  );
}