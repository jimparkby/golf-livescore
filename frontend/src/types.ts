export interface CurrentUser {
  id: string;
  name: string;
  avatarUrl: string;
  handicapIndex: string; // e.g. "12~14"
  accuracy: number;      // 0..100
  totalRounds: number;
}

export interface ActiveRound {
  id: string;
  playerId: string;
  playerName: string;
  avatarUrl: string;
  holesPlayed: number;
  startedAt: string; // ISO
}
