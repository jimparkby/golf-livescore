import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { getVisibleRounds, useRoundExpiry, ROUND_TTL_MS } from "@/hooks/useRoundExpiry";
import type { ActiveRound } from "@/types";

const makeRound = (offsetMs: number): ActiveRound => ({
  id: String(offsetMs),
  playerId: "p1",
  playerName: "Test",
  avatarUrl: "",
  holesPlayed: 5,
  startedAt: new Date(Date.now() - offsetMs).toISOString(),
});

describe("getVisibleRounds", () => {
  it("includes a round started 23h 59m ago", () => {
    const round = makeRound(23 * 60 * 60 * 1000 + 59 * 60 * 1000);
    expect(getVisibleRounds([round])).toHaveLength(1);
  });

  it("excludes a round started 24h 01m ago", () => {
    const round = makeRound(24 * 60 * 60 * 1000 + 60 * 1000);
    expect(getVisibleRounds([round])).toHaveLength(0);
  });

  it("excludes expired and keeps fresh", () => {
    const fresh = makeRound(1000);
    const expired = makeRound(ROUND_TTL_MS + 1000);
    expect(getVisibleRounds([fresh, expired])).toEqual([fresh]);
  });
});

describe("useRoundExpiry", () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it("removes a round after it crosses the 24h threshold on next interval tick", () => {
    // Round started (ROUND_TTL_MS - 30s) ago → still visible
    const almostExpired: ActiveRound = {
      id: "r1",
      playerId: "p1",
      playerName: "Test",
      avatarUrl: "",
      holesPlayed: 5,
      // fix startedAt relative to the fake clock base
      startedAt: new Date(Date.now() - (ROUND_TTL_MS - 30_000)).toISOString(),
    };

    const { result } = renderHook(() => useRoundExpiry([almostExpired]));
    expect(result.current).toHaveLength(1);

    // Advance 60s → round is now (ROUND_TTL_MS + 30s) old → expired
    act(() => { vi.advanceTimersByTime(60_000); });
    expect(result.current).toHaveLength(0);
  });
});
