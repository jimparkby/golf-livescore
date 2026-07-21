export type FormatId =
  | "stroke_play"
  | "stableford"
  | "match_play"
  | "scramble"
  | "best_ball"
  | "foursomes"
  | "skins"
  | "greensomes";

export type GolfFormat = {
  id: FormatId;
  name: string;
  emoji: string;
  players: string;
  description: string;
  tip: string;
  forGroup: boolean;
};

export const FORMATS: GolfFormat[] = [
  {
    id: "stroke_play",
    name: "Stroke Play",
    emoji: "🏅",
    players: "1–4 players",
    description: "Classic format. Every stroke counts — lowest total score wins.",
    tip: "Ideal for official handicaps and competitive rounds",
    forGroup: false,
  },
  {
    id: "stableford",
    name: "Stableford",
    emoji: "⭐",
    players: "1–4 players",
    description: "Points per hole: Bogey=1, Par=2, Birdie=3, Eagle=4. One bad hole doesn't ruin your round.",
    tip: "Great choice for high handicappers — a bad hole is not a disaster",
    forGroup: true,
  },
  {
    id: "match_play",
    name: "Match Play",
    emoji: "⚔️",
    players: "2 or 4 players",
    description: "Win each hole, not the total. The player who wins the most holes wins the match.",
    tip: "Intense format — every hole decides the outcome",
    forGroup: false,
  },
  {
    id: "scramble",
    name: "Scramble",
    emoji: "🤝",
    players: "2–4 players (team)",
    description: "Everyone hits — the best shot is chosen and all play from there. Team format, reduces pressure.",
    tip: "Best choice for corporate events and groups of mixed ability",
    forGroup: true,
  },
  {
    id: "best_ball",
    name: "Best Ball",
    emoji: "🎯",
    players: "4 players (2 pairs)",
    description: "Each player plays their own ball; the best score on each hole counts for the pair.",
    tip: "Lets each player shine — the best player in the pair makes the winning shot",
    forGroup: true,
  },
  {
    id: "foursomes",
    name: "Foursomes",
    emoji: "🔄",
    players: "4 players (2 pairs)",
    description: "Partners alternate shots on the same ball: one hits the tee shot, the other the next, and so on.",
    tip: "Requires perfect communication — you don't control every shot",
    forGroup: true,
  },
  {
    id: "skins",
    name: "Skins",
    emoji: "💰",
    players: "2–4 players",
    description: "Each hole is worth a skin. On a tie the skin carries over to the next hole — excitement until the end.",
    tip: "Adds excitement: the game can turn around right up to the last hole",
    forGroup: true,
  },
  {
    id: "greensomes",
    name: "Greensomes",
    emoji: "🌿",
    players: "4 players (2 pairs)",
    description: "Both players tee off, the best drive is chosen, then shots alternate. A mix of Best Ball and Foursomes.",
    tip: "Less strict than Foursomes — the tee shot still matters for both partners",
    forGroup: true,
  },
];

export const getFormat = (id: FormatId): GolfFormat =>
  FORMATS.find((f) => f.id === id) ?? FORMATS[0];

export const stablefordPoints = (score: number, par: number): number =>
  Math.max(0, 2 + par - score);

// Stableford points computed off the handicap-adjusted (net) score
export const netStablefordPoints = (score: number, par: number, strokesReceived: number): number =>
  stablefordPoints(score - strokesReceived, par);
