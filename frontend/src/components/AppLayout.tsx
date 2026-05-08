import { useEffect } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { Trophy, CircleUserRound, LineChart, Flag } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { to: "/", label: "Играть", icon: Flag, end: true },
  { to: "/tournaments", label: "Турниры", icon: Trophy },
  { to: "/stats", label: "Статистика", icon: LineChart },
  { to: "/profile", label: "Профиль", icon: CircleUserRound },
];

const AppLayout = () => {
  useEffect(() => {
    const tg = (window as any).Telegram?.WebApp;
    if (tg) {
      tg.ready();
      tg.expand();
      if (tg.requestFullscreen) tg.requestFullscreen();
    }
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <main className="flex-1 mx-auto w-full max-w-3xl px-4 pt-4 pb-28">
        <Outlet />
      </main>

      <nav className="fixed bottom-0 inset-x-0 z-30" style={{ background: "#000000", borderTop: "1px solid rgba(255,255,255,0.07)" }}>
        <div className="mx-auto max-w-3xl grid grid-cols-4" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
          {tabs.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  "relative flex flex-col items-center gap-1 py-3 text-[11px] font-medium transition-base",
                  isActive ? "text-action" : "text-muted-foreground",
                )
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <span
                      className="absolute top-0 left-1/2 -translate-x-1/2 h-[2px] w-8 rounded-full"
                      style={{ background: "hsl(var(--action))" }}
                    />
                  )}
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
