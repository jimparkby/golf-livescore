import { NavLink, Outlet } from "react-router-dom";
import { Trophy, CircleUserRound, LineChart, Flag } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTelegram } from "@/hooks/useTelegram";
import { useGolf } from "@/store/golfStore";
import { useMemo } from "react";
import { HeaderPanel } from "@/components/HeaderPanel";
import { getDifferentials, calcHandicapIndex } from "@/lib/handicap";
import type { CurrentUser } from "@/types";

const tabs = [
  { to: "/", label: "Play", icon: Flag, end: true },
  { to: "/tournaments", label: "Tournaments", icon: Trophy },
  { to: "/stats", label: "Stats", icon: LineChart },
  { to: "/profile", label: "Profile", icon: CircleUserRound },
];

const AppLayout = () => {
  useTelegram();

  const { profile, rounds } = useGolf();

  // stable empty array — prevents useRoundExpiry from re-running every render
  const noActiveRounds = useMemo(() => [], []);

  const currentUser = useMemo((): CurrentUser => {
    const name = [profile.firstName, profile.lastName].filter(Boolean).join(" ") || "Player";

    // same calculation as Stats page
    const diffs = getDifferentials(rounds, "me", profile.hcp);
    const calcHcp = calcHandicapIndex(diffs.map((d) => d.differential));
    const hcp = calcHcp ?? (profile.hcp > 0 ? profile.hcp : null);
    const handicapIndex = hcp !== null ? hcp.toFixed(1) : "~";

    const allScores = rounds.flatMap((r) => {
      const me = r.players.find((p) => p.isMe);
      return me ? r.scores[me.id] ?? [] : [];
    });
    const accuracy = allScores.length
      ? Math.round((allScores.filter((s) => s.gir).length / allScores.length) * 100)
      : 0;

    return {
      id: "me",
      name,
      avatarUrl: profile.photoUrl ?? "",
      handicapIndex,
      accuracy,
      totalRounds: rounds.filter(r => r.players.some(p => p.isMe)).length,
    };
  }, [profile, rounds]);

  return (
    <div className="flex flex-col" style={{ minHeight: "100dvh" }}>
      <div
        className="fixed top-0 inset-x-0 z-40 flex items-center"
        style={{
          height: "calc(var(--header-h) + var(--tg-safe-top))",
          background: "#000000",
          borderBottom: "1px solid rgba(255,255,255,0.07)",
          paddingTop: "calc(var(--tg-safe-top) + 10px)",
          paddingBottom: 10,
          paddingLeft: 16,
          paddingRight: 16,
        }}
      >
        <div className="w-full max-w-3xl mx-auto">
          <HeaderPanel currentUser={currentUser} activeRounds={noActiveRounds} />
        </div>
      </div>

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
