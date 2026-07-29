import { COURSES, type Course } from "@/lib/courses";
import { stablefordPoints, netStablefordPoints, type FormatId } from "@/lib/formats";
import { calcCourseHcpForMode, holeRankInSet, holeStrokesInSet } from "@/lib/handicap";
import type { Round, Player } from "@/store/golfStore";
import { getHcpGroup, detectGender, HCP_GROUP_ORDER, type Gender } from "@/lib/hcpGroups";

export type PlayerRoundStats = {
  total: number;
  vsPar: number;
  points: number;
  netVsPar: number;
  netPoints: number;
  holesPlayed: number;
  totalHoles: number;
};

/** Net (HCP-adjusted) stats for one player in one round. Shared by
 *  TournamentLeaderboard (single round) and the cross-round tournament
 *  aggregator below, so both use identical scoring math. */
export function computePlayerRoundStats(player: Player, round: Round, course: Course): PlayerRoundStats {
  const holesMode = round.holesMode ?? "18";
  const playHoles = holesMode === "front9"
    ? course.holes.filter((h) => h.number <= 9)
    : holesMode === "back9"
    ? course.holes.filter((h) => h.number > 9)
    : course.holes;

  const teeInfo = course.tees.find((t) => t.color === (player.tee ?? "yellow")) ?? course.tees[0];
  const courseHcp = calcCourseHcpForMode(player.hcp, teeInfo.slope, teeInfo.rating, course.totalPar, holesMode);

  const played = round.scores[player.id] ?? [];
  let total = 0, vsPar = 0, points = 0, netVsPar = 0, netPoints = 0;
  played.forEach((s) => {
    const h = course.holes.find((h) => h.number === s.hole);
    const par = h?.par ?? 4;
    const strokes = h ? holeStrokesInSet(courseHcp, holeRankInSet(h, playHoles), playHoles.length) : 0;
    total += s.score;
    vsPar += s.score - par;
    points += stablefordPoints(s.score, par);
    netVsPar += s.score - strokes - par;
    netPoints += netStablefordPoints(s.score, par, strokes);
  });

  return { total, vsPar, points, netVsPar, netPoints, holesPlayed: played.length, totalHoles: playHoles.length };
}

type PlayerAgg = {
  key: string;
  name: string;
  hcp: number;
  gender: Gender;
  photoUrl?: string;
  isMe?: boolean;
  rounds: { round: Round; stats: PlayerRoundStats }[];
};

function buildAggregates(rounds: Round[], tournamentId: string): PlayerAgg[] {
  const relevant = rounds.filter((r) => r.tournamentId === tournamentId);
  const byKey = new Map<string, PlayerAgg>();

  relevant.forEach((round) => {
    const course = COURSES.find((c) => c.id === round.courseId);
    if (!course) return;
    round.players.forEach((player) => {
      const stats = computePlayerRoundStats(player, round, course);
      const key = player.userId ?? `guest:${player.name.trim().toLowerCase()}`;
      const gender: Gender = player.gender ?? detectGender(player.name);
      let agg = byKey.get(key);
      if (!agg) {
        agg = { key, name: player.name, hcp: player.hcp, gender, photoUrl: player.photoUrl, isMe: player.isMe, rounds: [] };
        byKey.set(key, agg);
      }
      agg.rounds.push({ round, stats });
    });
  });

  return [...byKey.values()];
}

export type LeaderboardEntry = {
  key: string;
  name: string;
  hcp: number;
  gender: Gender;
  photoUrl?: string;
  isMe?: boolean;
  totalPoints: number;
  totalNetVsPar: number;
  todayPoints: number;
  todayNetVsPar: number;
  thru: number;
  totalHoles: number;
  todayCompleted: boolean;
};

export type FlightGroup = {
  key: string;
  label: string;
  entries: (LeaderboardEntry & { pos: string })[];
};

/** Standard competition ranking: ties share a position, next position skips
 *  ahead (1,2,2,4 → displayed "T2" on ties), matching the reference board. */
function rankWithTies<T>(sortedDesc: T[], valueOf: (t: T) => number): { pos: string; item: T }[] {
  const result: { pos: string; item: T }[] = [];
  let i = 0;
  while (i < sortedDesc.length) {
    let j = i;
    while (j + 1 < sortedDesc.length && valueOf(sortedDesc[j + 1]) === valueOf(sortedDesc[i])) j++;
    const place = i + 1;
    const label = j > i ? `T${place}` : `${place}`;
    for (let k = i; k <= j; k++) result.push({ pos: label, item: sortedDesc[k] });
    i = j + 1;
  }
  return result;
}

/** Aggregates every round tagged with `tournamentId` (one per playing group)
 *  into flighted (gender + HCP) leaderboards, per the club's existing
 *  HCP-group convention (see lib/hcpGroups.ts). */
export function computeTournamentLeaderboard(rounds: Round[], tournamentId: string, format: FormatId): FlightGroup[] {
  const isStableford = format === "stableford";
  const todayStr = new Date().toDateString();

  const entries: LeaderboardEntry[] = buildAggregates(rounds, tournamentId).map((agg) => {
    const totalPoints = agg.rounds.reduce((a, r) => a + r.stats.netPoints, 0);
    const totalNetVsPar = agg.rounds.reduce((a, r) => a + r.stats.netVsPar, 0);
    const todayRound =
      agg.rounds.find((r) => new Date(r.round.date).toDateString() === todayStr) ??
      [...agg.rounds].sort((a, b) => new Date(b.round.date).getTime() - new Date(a.round.date).getTime())[0];

    return {
      key: agg.key,
      name: agg.name,
      hcp: agg.hcp,
      gender: agg.gender,
      photoUrl: agg.photoUrl,
      isMe: agg.isMe,
      totalPoints,
      totalNetVsPar,
      todayPoints: todayRound?.stats.netPoints ?? 0,
      todayNetVsPar: todayRound?.stats.netVsPar ?? 0,
      thru: todayRound?.stats.holesPlayed ?? 0,
      totalHoles: todayRound?.stats.totalHoles ?? 18,
      todayCompleted: todayRound?.round.completed ?? false,
    };
  });

  const byFlight = new Map<string, LeaderboardEntry[]>();
  entries.forEach((e) => {
    const flight = getHcpGroup(e.hcp, e.gender);
    const arr = byFlight.get(flight) ?? [];
    arr.push(e);
    byFlight.set(flight, arr);
  });

  return HCP_GROUP_ORDER.filter((label) => byFlight.has(label)).map((label) => {
    const list = byFlight.get(label)!;
    const sorted = [...list].sort((a, b) =>
      isStableford ? b.totalPoints - a.totalPoints : a.totalNetVsPar - b.totalNetVsPar
    );
    const ranked = rankWithTies(sorted, (e) => (isStableford ? e.totalPoints : e.totalNetVsPar));
    return { key: label, label, entries: ranked.map((r) => ({ ...r.item, pos: r.pos })) };
  });
}
