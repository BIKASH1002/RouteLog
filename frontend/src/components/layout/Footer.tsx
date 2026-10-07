export function Footer() {
  return (
    <footer className="mt-16 border-t border-slate-200 bg-white">
      <div className="max-w-[1400px] mx-auto px-6 py-5 flex items-center justify-between text-xs text-slate-500">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-navy text-sm">RouteLog</span>
        </div>
        <div className="flex items-center gap-3">
          <span>v0.1.0</span>
          <span>·</span>
          <span className="inline-flex items-center gap-1.5 text-emerald-600"></span>
        </div>
      </div>
    </footer>
  );
}