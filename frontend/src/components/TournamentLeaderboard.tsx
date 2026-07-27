import { Avatar } from "@/components/PlayerAvatar";
import { COURSES } from "@/lib/courses";
import { stablefordPoints, netStablefordPoints, type FormatId } from "@/lib/formats";
import { calcCourseHcpForMode, holeRankInSet, holeStrokesInSet } from "@/lib/handicap";
import { useGolf, type Player } from "@/store/golfStore";
import { cn } from "@/lib/utils";

const parSign = (v: number) => (v === 0 ? "E" : v > 0 ? `+${v}` : `${v}`);
const parColor = (v: number) => (v < 0 ? "#22c55e" : v === 0 ? "rgba(255,255,255,0.9)" : "#f87171");

/* ── Leaderboard ── */
export const TournamentLeaderboard = ({
  activeRound,
  course,
  format,
}: {
  activeRound: NonNullable<ReturnType<typeof useGolf>["activeRound"]>;
  course: ReturnType<typeof COURSES.find> & object;
  format: FormatId;
}) => {
  const isStableford = format === "stableford";
  const isMatchPlay = format === "match_play";
  const isScramble = format === "scramble";
  const isFourball = format === "best_ball";
  const isTeam = isScramble || isFourball;

  const teams = activeRound.teams;
  const teamAIds = teams?.[0] ?? [];
  const teamBIds = teams?.[1] ?? [];

  /* ── HCP / net-scoring helpers, shared by every format below ── */
  const _mode = activeRound.holesMode ?? "18";
  const playHoles = _mode === "front9"
    ? course.holes.filter((h) => h.number <= 9)
    : _mode === "back9"
    ? course.holes.filter((h) => h.number > 9)
    : course.holes;

  const getCourseHcp = (p: Player) => {
    const teeInfo = course.tees.find((t) => t.color === (p.tee ?? "yellow")) ?? course.tees[0];
    return calcCourseHcpForMode(p.hcp, teeInfo.slope, teeInfo.rating, course.totalPar, _mode);
  };
  const getHoleStrokes = (p: Player, h: typeof course.holes[0]) => {
    const rank = holeRankInSet(h, playHoles);
    return holeStrokesInSet(getCourseHcp(p), rank, playHoles.length);
  };

  /* ── Match Play (2 players or 2 teams) — net: strokes = difference in course HCP ── */
  if (isMatchPlay) {
    const p1 = activeRound.players[0];
    const p2 = activeRound.players[1];
    if (!p1 || !p2) return null;
    const holes = playHoles;
    const ch1 = getCourseHcp(p1);
    const ch2 = getCourseHcp(p2);
    const strokeDiff = Math.abs(ch1 - ch2);
    const receiver = ch1 > ch2 ? p1.id : ch2 > ch1 ? p2.id : null;
    const strokesFor = (playerId: string, h: typeof course.holes[0]) => {
      if (playerId !== receiver) return 0;
      return holeStrokesInSet(strokeDiff, holeRankInSet(h, playHoles), playHoles.length);
    };
    let p1Wins = 0, p2Wins = 0;
    const holeResults: ("p1" | "p2" | "halved" | null)[] = holes.map((h) => {
      const s1 = activeRound.scores[p1.id]?.find((x) => x.hole === h.number);
      const s2 = activeRound.scores[p2.id]?.find((x) => x.hole === h.number);
      if (!s1 || !s2) return null;
      const n1 = s1.score - strokesFor(p1.id, h);
      const n2 = s2.score - strokesFor(p2.id, h);
      if (n1 < n2) { p1Wins++; return "p1"; }
      if (n2 < n1) { p2Wins++; return "p2"; }
      return "halved";
    });
    const diff = p1Wins - p2Wins;
    const statusText = diff === 0 ? "AS" : diff > 0 ? `${diff} UP` : `${Math.abs(diff)} UP`;
    const statusPlayer = diff > 0 ? p1.name.split(" ")[0] : diff < 0 ? p2.name.split(" ")[0] : null;
    return (
      <div className="flex-1 overflow-y-auto px-5 pb-4 pt-2 space-y-3">
        <div className="rounded-2xl p-4 text-center" style={{ background: "#1a1a1a" }}>
          <div className="text-white/40 text-xs uppercase tracking-wider mb-1">Match status (net)</div>
          <div className="text-white font-black text-3xl">{statusPlayer ? `${statusPlayer} ${statusText}` : "AS"}</div>
          <div className="text-white/40 text-xs mt-1">{p1Wins + p2Wins} holes played</div>
          {strokeDiff > 0 && receiver && (
            <div className="text-white/30 text-[11px] mt-1">
              {(receiver === p1.id ? p1 : p2).name.split(" ")[0]} receives {strokeDiff} strokes (CH {ch1} vs {ch2})
            </div>
          )}
        </div>
        <div className="rounded-2xl overflow-hidden" style={{ background: "#1a1a1a" }}>
          <div className="grid px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider" style={{ gridTemplateColumns: "1fr auto auto 1fr", color: "rgba(255,255,255,0.4)", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
            <div>{p1.name.split(" ")[0]}</div>
            <div className="w-8 text-center">#</div>
            <div className="w-8 text-center">Par</div>
            <div className="text-right">{p2.name.split(" ")[0]}</div>
          </div>
          {holes.map((h, i) => {
            const r = holeResults[i];
            const s1 = activeRound.scores[p1.id]?.find((x) => x.hole === h.number);
            const s2 = activeRound.scores[p2.id]?.find((x) => x.hole === h.number);
            const dot1 = strokesFor(p1.id, h) > 0;
            const dot2 = strokesFor(p2.id, h) > 0;
            return (
              <div key={h.number} className="grid items-center px-4 py-2 border-t border-white/5" style={{ gridTemplateColumns: "1fr auto auto 1fr" }}>
                <div className={cn("font-black text-lg tabular-nums flex items-center gap-1", r === "p1" ? "text-action" : "text-white/50")}>
                  {s1?.score ?? "—"}{dot1 && <span className="text-[10px] text-white/30">•</span>}
                </div>
                <div className="w-8 text-center text-white/40 text-xs font-bold">{h.number}</div>
                <div className="w-8 text-center text-white/25 text-xs">{h.par}</div>
                <div className={cn("font-black text-lg tabular-nums text-right flex items-center justify-end gap-1", r === "p2" ? "text-action" : "text-white/50")}>
                  {dot2 && <span className="text-[10px] text-white/30">•</span>}{s2?.score ?? "—"}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  /* ── Team leaderboard (Scramble / Fourball) — net (HCP-adjusted) ── */
  if (isTeam && teams) {
    type TeamEntry = { name: string; playerIds: string[]; total: number; vsPar: number; points: number; netVsPar: number; netPoints: number; holesPlayed: number };
    const teamEntries: TeamEntry[] = [
      { name: "Team A", playerIds: teamAIds },
      { name: "Team B", playerIds: teamBIds },
    ].map(({ name, playerIds }) => {
      const teamPlayers = activeRound.players.filter((p) => playerIds.includes(p.id));
      const captainId = playerIds[0];

      let total = 0, vsPar = 0, points = 0, netVsPar = 0, netPoints = 0, holesPlayed = 0;

      if (isScramble) {
        // Score stored under captain only. Team allowance = average of members' course HCP
        // (simplified "combined handicap" convention for casual scrambles — adjust if your club uses a different %).
        const teamCh = teamPlayers.length
          ? Math.round(teamPlayers.reduce((a, p) => a + getCourseHcp(p), 0) / teamPlayers.length)
          : 0;
        const scores = activeRound.scores[captainId] ?? [];
        holesPlayed = scores.length;
        scores.forEach((s) => {
          const h = course.holes.find((h) => h.number === s.hole);
          const par = h?.par ?? 4;
          const strokes = h ? holeStrokesInSet(teamCh, holeRankInSet(h, playHoles), playHoles.length) : 0;
          total += s.score;
          vsPar += s.score - par;
          points += stablefordPoints(s.score, par);
          netVsPar += s.score - strokes - par;
          netPoints += netStablefordPoints(s.score, par, strokes);
        });
      } else {
        // Fourball: best NET score per hole among team members (each player's own course HCP applies)
        const holesSet = new Set<number>();
        teamPlayers.forEach((p) => {
          (activeRound.scores[p.id] ?? []).forEach((s) => holesSet.add(s.hole));
        });
        holesSet.forEach((holeNum) => {
          const h = course.holes.find((h) => h.number === holeNum);
          const par = h?.par ?? 4;
          let bestGross = Infinity, bestNet = Infinity;
          teamPlayers.forEach((p) => {
            const s = activeRound.scores[p.id]?.find((x) => x.hole === holeNum);
            if (!s) return;
            if (s.score < bestGross) bestGross = s.score;
            const strokes = h ? getHoleStrokes(p, h) : 0;
            const net = s.score - strokes;
            if (net < bestNet) bestNet = net;
          });
          if (bestGross !== Infinity) {
            total += bestGross;
            vsPar += bestGross - par;
            netVsPar += bestNet - par;
            netPoints += stablefordPoints(bestNet, par);
            holesPlayed++;
          }
        });
      }

      return { name, playerIds, total, vsPar, points, netVsPar, netPoints, holesPlayed };
    });

    const sorted = [...teamEntries].sort((a, b) =>
      isStableford ? b.netPoints - a.netPoints : a.netVsPar - b.netVsPar
    );

    return (
      <div className="flex-1 overflow-y-auto px-5 pb-4 pt-2">
        <div className="rounded-2xl overflow-hidden" style={{ background: "#1a1a1a" }}>
          <div className="grid px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider" style={{ gridTemplateColumns: "2rem 1fr auto auto", color: "rgba(255,255,255,0.4)", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
            <div>#</div><div>Команда</div>
            <div className="w-12 text-center">{isStableford ? "Net Pts" : "Net"}</div>
            <div className="w-12 text-center">Score</div>
          </div>
          {sorted.map((e, i) => (
            <div key={e.name} className="grid items-center px-4 py-3 border-t border-white/5" style={{ gridTemplateColumns: "2rem 1fr auto auto" }}>
              <div className="text-sm font-black" style={{ color: i === 0 ? "#22c55e" : "rgba(255,255,255,0.3)" }}>
                {["🥇", "🥈"][i] ?? i + 1}
              </div>
              <div>
                <div className="text-white font-bold text-sm">{e.name}</div>
                <div className="text-white/40 text-xs">
                  {activeRound.players.filter((p) => e.playerIds.includes(p.id)).map((p) => p.name.split(" ")[0]).join(" & ")}
                  {" · "}gross {isStableford ? e.points : parSign(e.vsPar)}
                </div>
              </div>
              <div className="w-12 text-center font-black text-base tabular-nums" style={{ color: isStableford ? "#fff" : parColor(e.netVsPar) }}>
                {isStableford ? e.netPoints : parSign(e.netVsPar)}
              </div>
              <div className="w-12 text-center text-white/60 font-bold text-sm tabular-nums">{e.total || "—"}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  /* ── Individual leaderboard (Stroke Play / Stableford) — net (HCP-adjusted) ranking ── */
  const entries = activeRound.players.map((p) => {
    const played = activeRound.scores[p.id] ?? [];
    const ch = getCourseHcp(p);
    let total = 0, vsPar = 0, points = 0, netVsPar = 0, netPoints = 0;
    played.forEach((s) => {
      const h = course.holes.find((h) => h.number === s.hole);
      const par = h?.par ?? 4;
      const strokes = h ? getHoleStrokes(p, h) : 0;
      total += s.score;
      vsPar += s.score - par;
      points += stablefordPoints(s.score, par);
      netVsPar += s.score - strokes - par;
      netPoints += netStablefordPoints(s.score, par, strokes);
    });
    return { player: p, total, vsPar, points, netVsPar, netPoints, ch, holesPlayed: played.length };
  });
  const sorted = [...entries].sort((a, b) =>
    isStableford ? b.netPoints - a.netPoints : a.netVsPar - b.netVsPar || a.total - b.total
  );
  const medals = ["🥇", "🥈", "🥉"];

  return (
    <div className="flex-1 overflow-y-auto px-5 pb-4 pt-2">
      <div className="rounded-2xl overflow-hidden" style={{ background: "#1a1a1a" }}>
        <div className="grid px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider" style={{ gridTemplateColumns: "2rem 1fr auto auto", color: "rgba(255,255,255,0.4)", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
          <div>#</div><div>Игрок</div>
          <div className="w-12 text-center">{isStableford ? "Net Pts" : "Net"}</div>
          <div className="w-12 text-center">Score</div>
        </div>
        {sorted.map((e, i) => (
          <div key={e.player.id} className="grid items-center px-4 py-3 border-t border-white/5" style={{ gridTemplateColumns: "2rem 1fr auto auto" }}>
            <div className="text-sm font-black" style={{ color: i < 3 ? "#22c55e" : "rgba(255,255,255,0.3)" }}>
              {medals[i] ?? i + 1}
            </div>
            <div className="flex items-center gap-2 min-w-0">
              <Avatar name={e.player.name} size="sm" tone={e.player.isMe ? "orange" : "muted"} photoUrl={e.player.photoUrl} />
              <div className="min-w-0">
                <div className="text-white font-semibold text-sm truncate">{e.player.name.split(" ")[0]} <span className="text-white/40 font-normal">[{e.player.hcp}]</span></div>
                <div className="text-white/40 text-xs">{e.holesPlayed} holes · gross {isStableford ? e.points : parSign(e.vsPar)}</div>
              </div>
            </div>
            <div className="w-12 text-center">
              {isStableford
                ? <span className="text-white font-black text-base tabular-nums">{e.netPoints}</span>
                : <span className="font-black text-base tabular-nums" style={{ color: parColor(e.netVsPar) }}>{parSign(e.netVsPar)}</span>
              }
            </div>
            <div className="w-12 text-center text-white/60 font-bold text-sm tabular-nums">{e.total || "—"}</div>
          </div>
        ))}
        {sorted.length === 0 && (
          <div className="py-8 text-center text-white/30 text-sm">Enter scores to see leaderboard</div>
        )}
      </div>
    </div>
  );
};
