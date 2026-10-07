import { Outlet } from "react-router-dom";
import { TopNav } from "./TopNav";
import { Footer } from "./Footer";

export function AppLayout() {
  return (
    <div className="min-h-full flex flex-col">
      <TopNav />
      <main className="flex-1">
        <div className="max-w-[1400px] mx-auto px-6 py-8">
          <Outlet />
        </div>
      </main>
      <Footer />
    </div>
  );
}