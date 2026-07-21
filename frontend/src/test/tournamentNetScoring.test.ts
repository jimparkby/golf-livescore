import { describe, it, expect } from "vitest";
import { calcCourseHcpForMode, holeRankInSet, holeStrokesInSet } from "@/lib/handicap";
import { stablefordPoints, netStablefordPoints } from "@/lib/formats";
import { getAllCourses } from "@/lib/courses";

describe("tournament leaderboard net (HCP-adjusted) scoring", () => {
  const course = getAllCourses().find((c) => c.id === "championship")!;
  const tee = course.tees.find((t) => t.color === "yellow")!;
  const playHoles = course.holes;

  const ch = (hcp: number) => calcCourseHcpForMode(hcp, tee.slope, tee.rating, course.totalPar, "18");
  const strokesOn = (playerCh: number, holeNumber: number) => {
    const h = playHoles.find((h) => h.number === holeNumber)!;
    return holeStrokesInSet(playerCh, holeRankInSet(h, playHoles), playHoles.length);
  };

  // Identical gross scores for a 5-HCP and a 24-HCP player over holes 1-6
  const scores = [
    { hole: 1, par: 4, score: 5 },
    { hole: 2, par: 5, score: 6 },
    { hole: 3, par: 3, score: 4 },
    { hole: 4, par: 4, score: 6 },
    { hole: 5, par: 4, score: 6 },
    { hole: 6, par: 4, score: 6 },
  ];

  it("computes course handicap from HCP index", () => {
    expect(ch(5)).toBe(4);
    expect(ch(24)).toBe(25);
  });

  it("same gross performance yields different net vs par by HCP", () => {
    const lowCh = ch(5);
    const highCh = ch(24);

    const grossVsPar = scores.reduce((a, s) => a + (s.score - s.par), 0);
    const lowStrokes = scores.reduce((a, s) => a + strokesOn(lowCh, s.hole), 0);
    const highStrokes = scores.reduce((a, s) => a + strokesOn(highCh, s.hole), 0);

    expect(grossVsPar).toBe(9);
    expect(lowStrokes).toBe(1);
    expect(highStrokes).toBe(8);

    const lowNetVsPar = grossVsPar - lowStrokes;
    const highNetVsPar = grossVsPar - highStrokes;

    expect(lowNetVsPar).toBe(8);
    expect(highNetVsPar).toBe(1);
    // The 24-HCP player ranks better on net despite an identical gross round
    expect(highNetVsPar).toBeLessThan(lowNetVsPar);
  });

  it("net Stableford rewards the higher-HCP player for playing to their handicap", () => {
    const lowCh = ch(5);
    const highCh = ch(24);

    const grossPoints = scores.reduce((a, s) => a + stablefordPoints(s.score, s.par), 0);
    const lowNetPoints = scores.reduce((a, s) => a + netStablefordPoints(s.score, s.par, strokesOn(lowCh, s.hole)), 0);
    const highNetPoints = scores.reduce((a, s) => a + netStablefordPoints(s.score, s.par, strokesOn(highCh, s.hole)), 0);

    expect(grossPoints).toBe(3);
    expect(lowNetPoints).toBe(4);
    expect(highNetPoints).toBe(11);
    expect(highNetPoints).toBeGreaterThan(lowNetPoints);
  });
});
