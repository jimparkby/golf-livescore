import { useState, useEffect } from "react";
import type { ActiveRound } from "@/types";

export const ROUND_TTL_MS = 24 * 60 * 60 * 1000;

export function getVisibleRounds(rounds: ActiveRound[], now = Date.now()): ActiveRound[] {
  return rounds.filter((r) => now - new Date(r.startedAt).getTime() < ROUND_TTL_MS);
}

export function useRoundExpiry(rounds: ActiveRound[]): ActiveRound[] {
  const [visible, setVisible] = useState(() => getVisibleRounds(rounds));

  useEffect(() => {
    setVisible(getVisibleRounds(rounds));

    const interval = setInterval(() => {
      setVisible(getVisibleRounds(rounds));
    }, 60_000);

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        setVisible(getVisibleRounds(rounds));
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [rounds]);

  return visible;
}
