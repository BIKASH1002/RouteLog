import { Link } from "react-router-dom";
import { Button } from "../components/ui/Button";

export default function NotFoundPage() {
  return (
    <div className="text-center py-24">
      <h1 className="text-2xl font-bold text-navy mb-2">Page not found</h1>
      <p className="text-slate-500 mb-6">The page you're looking for doesn't exist.</p>
      <Link to="/">
        <Button>Back to Plan Trip</Button>
      </Link>
    </div>
  );
}