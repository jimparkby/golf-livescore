import { useState, useMemo } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { Trophy, CircleUserRound, LineChart, Flag } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTelegram } from "@/hooks/useTelegram";
import { useGolf, type Round } from "@/store/golfStore";
import { useOthersRounds } from "@/hooks/useOthersRounds";
import { HeaderPanel } from "@/components/HeaderPanel";
import { ScorecardModal } from "@/components/ScorecardModal";
import { getDifferentials, calcHandicapIndex } from "@/lib/handicap";
import { COURSES } from "@/lib/courses";
import type { CurrentUser, ActiveRound } from "@/types";

const tabs = [
  { to: "/", label: "Play", icon: Flag, end: true },
  { to: "/tournaments", label: "Tournaments", icon: Trophy },
  { to: "/stats", label: "Stats", icon: LineChart },
  { to: "/profile", label: "Profile", icon: CircleUserRound },
];

const AppLayout = () => {
  useTelegram();

  const location = useLocation();
  const isPlayTab = location.pathname === "/";

  const { profile, rounds, activeRound } = useGolf();
  const othersRounds = useOthersRounds();
  const [modalRound, setModalRound] = useState<ActiveRound | null>(null);

  const currentUser = useMemo((): CurrentUser => {
    const name = [profile.firstName, profile.lastName].filter(Boolean).join(" ") || "Player";
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

  const STORY_TTL_MS = 24 * 60 * 60 * 1000;

  const buildStoriesFromRound = (round: Round, ttlAnchor: string): ActiveRound[] => {
    const course = COURSES.find((c) => c.id === round.courseId);
    const myName = [profile.firstName, profile.lastName].filter(Boolean).join(" ") || "Player";

    return round.players.map((player) => {
      const scores = round.scores[player.id] ?? [];
      const played = scores.filter((s) => s.score > 0);
      const totalScore = played.reduce((a, s) => a + s.score, 0);
      const scorecard = played.map((s) => {
        const hole = course?.holes.find((h) => h.number === s.hole);
        return { hole: s.hole, par: hole?.par ?? 4, score: s.score };
      }).sort((a, b) => a.hole - b.hole);

      return {
        id: `${round.id}-${player.id}`,
        playerId: player.id,
        playerName: player.isMe ? myName : player.name,
        avatarUrl: player.isMe ? (profile.photoUrl ?? "") : "",
        holesPlayed: played.length,
        score: totalScore,
        startedAt: ttlAnchor,
        courseName: round.courseName.split(" · ")[0],
        scorecard,
      };
    });
  };

  // Строим сторис: свой раунд + раунды других пользователей (24ч)
  const myActiveRounds = useMemo((): ActiveRound[] => {
    const result: ActiveRound[] = [];

    // Свой активный раунд
    if (activeRound) {
      result.push(...buildStoriesFromRound(activeRound, activeRound.date));
    } else {
      // Свой недавно завершённый (24ч после окончания)
      const lastCompleted = rounds.find((r) => r.completed && r.players.some((p) => p.isMe));
      if (lastCompleted) {
        const anchor = lastCompleted.completedAt ?? lastCompleted.date;
        if (Date.now() - new Date(anchor).getTime() < STORY_TTL_MS) {
          result.push(...buildStoriesFromRound(lastCompleted, anchor));
        }
      }
    }

    // Раунды других пользователей
    for (const round of othersRounds) {
      result.push(...buildStoriesFromRound(round, round.date));
    }

    // Дедупликация по id
    const seen = new Set<string>();
    return result.filter((r) => (seen.has(r.id) ? false : (seen.add(r.id), true)));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeRound, rounds, othersRounds, profile]);

  return (
    <div className="flex flex-col" style={{ minHeight: "100dvh" }}>
      {isPlayTab && (
        <div
          className="fixed top-0 inset-x-0 z-40 flex items-center"
          style={{
            height: "calc(var(--header-h) + var(--tg-safe-top) + var(--tg-close-btn))",
            background: "#000000",
            borderBottom: "1px solid rgba(255,255,255,0.07)",
            paddingTop: "calc(var(--tg-safe-top) + var(--tg-close-btn) + 10px)",
            paddingBottom: 10,
            paddingLeft: 16,
            paddingRight: 16,
            overflow: "visible",
          }}
        >
          <div className="w-full max-w-3xl mx-auto" style={{ overflow: "visible" }}>
            <HeaderPanel
              currentUser={currentUser}
              activeRounds={myActiveRounds}
              onRoundPress={setModalRound}
            />
          </div>
        </div>
      )}

      <main
        className="flex-1 mx-auto w-full max-w-3xl px-4"
        style={{
          paddingTop: isPlayTab
            ? "calc(var(--header-h) + var(--tg-safe-top) + var(--tg-close-btn) + 16px)"
            : "calc(var(--tg-safe-top) + var(--tg-close-btn) + 16px)",
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

      {modalRound && (
        <ScorecardModal round={modalRound} onClose={() => setModalRound(null)} />
      )}
    </div>
  );
};

export default AppLayout;
