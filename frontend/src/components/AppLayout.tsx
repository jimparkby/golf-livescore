import { NavLink, Outlet } from "react-router-dom";
import { Trophy, CircleUserRound, LineChart, Tent } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { to: "/", label: "Играть", icon: Tent, end: true },
  { to: "/tournaments", label: "Турниры", icon: Trophy },
  { to: "/stats", label: "Статистика", icon: LineChart },
  { to: "/profile", label: "Профиль", icon: CircleUserRound },
];

const AppLayout = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header style={{ background: "#111111", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
        <div className="mx-auto max-w-3xl px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-full grid place-items-center" style={{ background: "rgba(34,197,94,0.15)", border: "1px solid rgba(34,197,94,0.3)" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L4 6v6c0 5.5 3.5 10.7 8 12 4.5-1.3 8-6.5 8-12V6L12 2z"
                  stroke="#22c55e" strokeWidth="1.8" fill="none" strokeLinejoin="round"/>
              </svg>
            </div>
            <div className="leading-tight">
              <div className="font-bold tracking-wide text-base text-white">GOLFMINSK</div>
              <div className="text-[10px] uppercase tracking-[0.2em]" style={{ color: "rgba(255,255,255,0.45)" }}>Live Scoring</div>
            </div>
          </div>
          <div className="text-xs font-medium" style={{ color: "rgba(255,255,255,0.45)" }}>Сезон 2026</div>
        </div>
      </header>

      <main className="flex-1 mx-auto w-full max-w-3xl px-4 pt-4 pb-28">
        <Outlet />
      </main>

      <nav className="fixed bottom-0 inset-x-0 z-30" style={{ background: "#111111", borderTop: "1px solid rgba(255,255,255,0.07)" }}>
        <div className="mx-auto max-w-3xl grid grid-cols-4" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
          {tabs.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  "flex flex-col items-center gap-1 py-3 text-[11px] font-medium transition-base",
                  isActive ? "text-action" : "text-muted-foreground",
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon
                    className={cn("h-5 w-5", isActive && "drop-shadow-[0_0_8px_rgba(34,197,94,0.7)]")}
                    strokeWidth={isActive ? 2.5 : 2}
                  />
                  <span>{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
};

export default AppLayout;
