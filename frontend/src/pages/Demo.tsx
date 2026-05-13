import { HeaderPanel } from "@/components/HeaderPanel";
import type { CurrentUser, ActiveRound } from "@/types";

const mockUser: CurrentUser = {
  id: "u1",
  name: "Timofey",
  avatarUrl: "https://i.pravatar.cc/150?img=12",
  handicapIndex: "12~14",
  accuracy: 100,
  totalRounds: 44,
};

const now = Date.now();

// Раунды завершены — startedAt в прошлом, видны 24ч
const mockRounds: ActiveRound[] = [
  {
    id: "r1",
    playerId: "p1",
    playerName: "Alex",
    avatarUrl: "",
    holesPlayed: 9,
    startedAt: new Date(now - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "r2",
    playerId: "p2",
    playerName: "Maria",
    avatarUrl: "",
    holesPlayed: 4,
    startedAt: new Date(now - 30 * 60 * 1000).toISOString(),
  },
];

export default function DemoPage() {
  return (
    <div style={{ padding: 24, maxWidth: 640, margin: "0 auto" }}>
      <HeaderPanel currentUser={mockUser} activeRounds={mockRounds} />
    </div>
  );
}
