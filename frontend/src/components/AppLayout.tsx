import { NavLink, Outlet } from "react-router-dom";
import { Trophy, CircleUserRound, LineChart, Flag } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTelegram } from "@/hooks/useTelegram";

const tabs = [
  { to: "/", label: "Играть", icon: Flag, end: true },
  { to: "/tournaments", label: "Турниры", icon: Trophy },
  { to: "/stats", label: "Статистика", icon: LineChart },
  { to: "/profile", label: "Профиль", icon: CircleUserRound },
];

export const AppHeader = ({ title }: { title?: string }) => (
  <div
    className="fixed top-0 inset-x-0 z-40 flex items-end justify-center"
    style={{
      height: "calc(var(--header-h) + var(--tg-safe-top))",
      background: "#000000",
      borderBottom: "1px solid rgba(255,255,255,0.07)",
      paddingBottom: "10px",
    }}
  >
    <span className="text-white font-bold tracking-[0.18em] text-base">
      {title ?? "GOLF"}
    </span>
  </div>
);

const AppLayout = () => {
  useTelegram();

  return (
    <div className="flex flex-col" style={{ minHeight: "100dvh" }}>
      <AppHeader />

      <main
        className="flex-1 mx-auto w-full max-w-3xl px-4"
        style={{
          paddingTop: "calc(var(--header-h) + var(--tg-safe-top) + 16px)",
          paddingBottom: "calc(var(--nav-h) + var(--tg-safe-bottom) + 8px)",
        }}
      >
        <Outlet />
      </main>

      <nav
        className="fixed bottom-0 inset-x-0 z-30"
        style={{
          background: "#000000",
          borderTop: "1px solid rgba(255,255,255,0.07)",
          height: "calc(var(--nav-h) + var(--tg-safe-bottom))",
        }}
      >
        <div className="mx-auto max-w-3xl grid grid-cols-4 h-[var(--nav-h)]">
          {tabs.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  "relative flex flex-col items-center justify-center gap-1 text-[11px] font-medium transition-base",
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
