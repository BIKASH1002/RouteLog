import { Routes, Route } from "react-router-dom";
import { AppLayout } from "./components/layout/AppLayout";
import PlanTripPage from "./pages/PlanTripPage";
import TripResultsPage from "./pages/TripResultsPage";
import DailyLogPage from "./pages/DailyLogPage";
import ComplianceRulesPage from "./pages/ComplianceRulesPage";
import NotFoundPage from "./pages/NotFoundPage";

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<PlanTripPage />} />
        <Route path="/results" element={<TripResultsPage />} />
        <Route path="/logs" element={<DailyLogPage />} />
        <Route path="/rules" element={<ComplianceRulesPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}