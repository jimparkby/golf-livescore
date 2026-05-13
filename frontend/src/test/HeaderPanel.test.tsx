import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { HeaderPanel } from "@/components/HeaderPanel";
import type { CurrentUser, ActiveRound } from "@/types";

const user: CurrentUser = {
  id: "u1",
  name: "Timofey",
  avatarUrl: "",
  handicapIndex: "12~14",
  accuracy: 100,
  totalRounds: 44,
};

const makeRound = (offsetMs: number): ActiveRound => ({
  id: String(offsetMs),
  playerId: "p1",
  playerName: "Alex",
  avatarUrl: "",
  holesPlayed: 9,
  startedAt: new Date(Date.now() - offsetMs).toISOString(),
});

describe("HeaderPanel", () => {
  it("shows active rounds list when rounds are present and fresh", () => {
    const round = makeRound(1000);
    render(<HeaderPanel currentUser={user} activeRounds={[round]} />);
    expect(screen.getByText("Alex")).toBeInTheDocument();
    expect(screen.getByText("+9")).toBeInTheDocument();
  });

  it("renders nothing on the right when activeRounds is empty", () => {
    const { container } = render(<HeaderPanel currentUser={user} activeRounds={[]} />);
    expect(container.querySelector("[data-rounds]")).toBeNull();
  });

  it("renders nothing on the right when all rounds are expired", () => {
    const expired = makeRound(25 * 60 * 60 * 1000);
    const { container } = render(<HeaderPanel currentUser={user} activeRounds={[expired]} />);
    expect(container.querySelector("[data-rounds]")).toBeNull();
  });
});
