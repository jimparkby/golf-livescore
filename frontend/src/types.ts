export interface CurrentUser {
  id: string;
  name: string;
  avatarUrl: string;
  handicapIndex: string;
  accuracy: number;
  totalRounds: number;
}

export interface ScorecardHole {
  hole: number;
  par: number;
  score: number;
}

export interface ActiveRound {
  id: string;
  playerId: string;
  playerName: string;
  avatarUrl: string;
  holesPlayed: number;  // кол-во сыгранных лунок
  score: number;        // сумма очков
  startedAt: string;
  courseName?: string;
  scorecard?: ScorecardHole[];
}
