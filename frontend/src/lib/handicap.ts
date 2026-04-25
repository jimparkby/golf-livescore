import { type Round } from "@/store/golfStore";
import { COURSES } from "@/lib/courses";

// WHS table: rounds played → how many best differentials to average
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

// Course Handicap from Handicap Index (WHS, no correction factor for simplicity)
export function courseHandicap(hi: number, slope: number): number {
  return Math.round(hi * (slope / 113));
}

// Score Differential (rounded to 1 decimal)
export function calcDifferential(adjustedGross: number, courseRating: number, slope: number): number {
  return Math.round(((adjustedGross - courseRating) * (113 / slope)) * 10) / 10;
}

// Handicap Index from array of differentials (uses last 20, best N, × 0.96)
export function calcHandicapIndex(diffs: number[]): number | null {
  const n = diffs.length;
  if (n < 3) return null;
  const useCount = DIFF_USE_COUNT[Math.min(n, 20)] ?? 8;
  const sorted = [...diffs].sort((a, b) => a - b);
  const best = sorted.slice(0, useCount);
  const avg = best.reduce((s, d) => s + d, 0) / best.length;
  return Math.min(54.0, Math.floor(avg * 0.96 * 10) / 10);
}

// How many differentials are used in calculation
export function diffUseCount(totalRounds: number): number {
  return DIFF_USE_COUNT[Math.min(totalRounds, 20)] ?? 8;
}

// Rounds to go before first HCP calculation
export function roundsNeeded(current: number): number {
  return Math.max(0, 3 - current);
}

// Build full differentials list from rounds for a given player
// storedHcp is used to compute the Net Double Bogey adjustment (WHS standard)
export function getDifferentials(
  rounds: Round[],
  playerId: string,
  storedHcp: number,
): ScoreDifferential[] {
  const completed = rounds
    .filter((r) => r.completed && (r.scores[playerId]?.length ?? 0) > 0)
    .slice(0, 20);

  const result: ScoreDifferential[] = completed.map((r) => {
    const course = COURSES.find((c) => c.id === r.courseId);
    const ch = courseHandicap(storedHcp, r.slope);
    const holeScores = r.scores[playerId] ?? [];

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

    const diff = calcDifferential(adjusted, r.rating, r.slope);

    return {
      roundId: r.id,
      date: r.date,
      courseName: r.courseName.split(" · ")[0],
      grossScore: gross,
      adjustedScore: adjusted,
      courseRating: r.rating,
      slopeRating: r.slope,
      differential: diff,
      isUsed: false,
    };
  });

  // Mark the best N differentials as "used"
  const n = result.length;
  if (n >= 3) {
    const useCount = DIFF_USE_COUNT[Math.min(n, 20)] ?? 8;
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
