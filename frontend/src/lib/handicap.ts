import { type Round, type HolesMode } from "@/store/golfStore";
import { COURSES, type Hole } from "@/lib/courses";

// Rounds played → how many best differentials to average
const DIFF_USE_COUNT: Record<number, number> = {
  3: 1, 4: 1, 5: 1,
  6: 2, 7: 2, 8: 2,
  9: 3, 10: 3, 11: 3,
  12: 4, 13: 4, 14: 4,
  15: 5, 16: 5,
  17: 6,
  18: 7,
  19: 8, 20: 8,
};

export type ScoreDifferential = {
  roundId: string;
  date: string;
  courseName: string;
  grossScore: number;
  adjustedScore: number;
  courseRating: number;
  slopeRating: number;
  differential: number;
  isUsed: boolean;
};

// Strokes received on a hole given course handicap
function strokesOnHole(holeHcp: number, courseHandicap: number): number {
  const base = Math.floor(courseHandicap / 18);
  const extra = courseHandicap % 18;
  return base + (extra > 0 && holeHcp <= extra ? 1 : 0);
}

// Net Double Bogey cap per hole
function adjustHoleScore(score: number, par: number, holeHcp: number, courseHandicap: number): number {
  const strokes = strokesOnHole(holeHcp, courseHandicap);
  const netDoubleBogey = par + 2 + strokes;
  return Math.min(score, netDoubleBogey);
}

// Course Handicap: HI × (Slope / 113) + (CR − Par)
export function courseHandicap(hi: number, slope: number, courseRating: number, par: number): number {
  return Math.round(hi * (slope / 113) + (courseRating - par));
}

// Score Differential (rounded to 1 decimal)
export function calcDifferential(adjustedGross: number, courseRating: number, slope: number): number {
  return Math.round(((adjustedGross - courseRating) * (113 / slope)) * 10) / 10;
}

// Handicap Index: average of all best differentials (up to 8) × 0.96 (WHS adjustment factor), capped at 54.0
export function calcHandicapIndex(diffs: number[]): number | null {
  const n = diffs.length;
  if (n < 3) return null;
  // Always use all available differentials (up to 8)
  const useCount = Math.min(n, 8);
  const sorted = [...diffs].sort((a, b) => a - b);
  const best = sorted.slice(0, useCount);
  const avg = best.reduce((s, d) => s + d, 0) / best.length;
  return Math.min(54.0, Math.round(avg * 0.96 * 10) / 10);
}

// How many differentials are used in calculation (all up to 8)
export function diffUseCount(totalRounds: number): number {
  return Math.min(totalRounds, 8);
}

// Rounds to go before first HCP calculation
export function roundsNeeded(current: number): number {
  return Math.max(0, 3 - current);
}

// Build full differentials list from rounds for a given player
// storedHcp is used to compute the Net Double Bogey adjustment per hole
export function getDifferentials(
  rounds: Round[],
  playerId: string,
  storedHcp: number,
): ScoreDifferential[] {
  const completed = rounds
    .filter((r) => r.completed && (r.scores[playerId]?.length ?? 0) > 0);

  const result: ScoreDifferential[] = completed.map((r) => {
    const course = COURSES.find((c) => c.id === r.courseId);
    const holeScores = r.scores[playerId] ?? [];
    const isNineHole = r.holesMode === "front9" || r.holesMode === "back9"
      || (r.holesMode === undefined && holeScores.length > 0 && holeScores.length <= 9);
    const par = (course?.totalPar ?? 72) / (isNineHole ? 2 : 1);
    const effectiveRating = r.rating / (isNineHole ? 2 : 1);
    const ch = courseHandicap(storedHcp, r.slope, effectiveRating, par);

    let gross = 0;
    let adjusted = 0;

    holeScores.forEach((s) => {
      gross += s.score;
      if (course) {
        const hole = course.holes.find((h) => h.number === s.hole);
        adjusted += hole ? adjustHoleScore(s.score, hole.par, hole.hcp, ch) : s.score;
      } else {
        adjusted += s.score;
      }
    });

    // For 9-hole rounds: scale differential to 18-hole equivalent (WHS standard)
    let diff = calcDifferential(adjusted, effectiveRating, r.slope);
    if (isNineHole) diff = Math.round(diff * 2 * 10) / 10;

    return {
      roundId: r.id,
      date: r.date,
      courseName: r.courseName.split(" · ")[0],
      grossScore: gross,
      adjustedScore: adjusted,
      courseRating: effectiveRating,
      slopeRating: r.slope,
      differential: diff,
      isUsed: false,
    };
  });

  // Mark the best N differentials as "used" (all up to 8)
  const n = result.length;
  if (n >= 3) {
    const useCount = Math.min(n, 8);
    const sortedByDiff = [...result].sort((a, b) => a.differential - b.differential);
    const usedIds = new Set(sortedByDiff.slice(0, useCount).map((x) => x.roundId));
    result.forEach((r) => { r.isUsed = usedIds.has(r.roundId); });
  }

  return result;
}

// Playing Handicap for a specific course (used in score card display)
export function playingHandicap(hi: number, slope: number, courseRating: number, par: number): number {
  return Math.round(hi * (slope / 113) + (courseRating - par));
}

/** Course Handicap for a given holes mode (9-hole = half of 18-hole CH) */
export function calcCourseHcpForMode(
  hi: number, slope: number, cr: number, par: number, holesMode: HolesMode
): number {
  const ch18 = courseHandicap(hi, slope, cr, par)
  return holesMode === "18" ? ch18 : Math.round(ch18 / 2)
}

/** Rank of a hole within the play set: 1 = hardest (lowest hole hcp) */
export function holeRankInSet(hole: Hole, holes: Hole[]): number {
  const sorted = [...holes].sort((a, b) => a.hcp - b.hcp)
  return sorted.findIndex(h => h.number === hole.number) + 1
}

/**
 * Strokes a player receives (+) or gives (-) on a hole.
 * courseHcp — Course Handicap; holeRank — rank within play set (1-based); totalHoles — 9 or 18
 */
export function holeStrokesInSet(courseHcp: number, holeRank: number, totalHoles: number): number {
  if (courseHcp === 0) return 0
  if (courseHcp > 0) {
    const full = Math.floor(courseHcp / totalHoles)
    const extra = courseHcp % totalHoles
    return full + (extra > 0 && holeRank <= extra ? 1 : 0)
  }
  // Negative HCP: give strokes on easiest holes (highest rank)
  return -(holeRank > totalHoles + courseHcp ? 1 : 0)
}
