import { NavLink, useLocation } from "react-router-dom";
import { Trophy, Play, BarChart3, User } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { to: "/", label: "Турниры", icon: Trophy, end: true },
  { to: "/play", label: "Играть", icon: Play },
  { to: "/stats", label: "Статистика", icon: BarChart3 },
  { to: "/profile", label: "Профиль", icon: User },
];

export function BottomNav() {
  const location = useLocation();
  // Hide on auth page
  if (location.pathname.startsWith("/auth")) return null;

  return (
    <nav
      aria-label="Основная навигация"
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="mx-auto grid max-w-screen-md grid-cols-4">
        {items.map(({ to, label, icon: Icon, end }) => (
          <li key={to}>
            <NavLink
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  "flex flex-col items-center justify-center gap-1 py-2.5 text-[11px] uppercase tracking-wider transition-colors",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon
                    className={cn(
                      "h-5 w-5 transition-transform",
                      isActive && "scale-110"
                    )}
                  />
                  <span className="font-medium">{label}</span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}