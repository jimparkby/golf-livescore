import { create } from "zustand";
import { persist } from "zustand/middleware";
import { COURSES, type Course } from "@/lib/courses";

export type Player = {
  id: string;
  name: string;
  initials: string;
  hcp: number;
  isMe?: boolean;
};

export type HoleScore = {
  hole: number;
  score: number;
  putts: number;
  teeShot?: "fairway" | "left" | "right" | "long" | "short" | "miss";
  fairwayBunker?: boolean;
  greenSideBunker?: boolean;
  hazard?: boolean;
  outOfBounds?: boolean;
};

export type Round = {
  id: string;
  date: string; // ISO
  courseId: string;
  courseName: string;
  tee: string;
  rating: number;
  slope: number;
  players: Player[];
  scores: Record<string, HoleScore[]>; // playerId -> scores
  completed: boolean;
};

export type Profile = {
  firstName: string;
  lastName: string;
  initials: string;
  hcp: number;
  homeClub: string;
  email: string;
  city: string;
  memberSince: string;
};

export type FrequentPlayer = Player;

type State = {
  profile: Profile;
  frequent: FrequentPlayer[];
  rounds: Round[];
  activeRound: Round | null;
  updateProfile: (p: Partial<Profile>) => void;
  startRound: (course: Course, players: Player[]) => void;
  cancelActiveRound: () => void;
  enterScore: (playerId: string, score: HoleScore) => void;
  finishRound: () => void;
  addFrequent: (p: Player) => void;
};

const mkInitials = (name: string) =>
  name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

const defaultProfile: Profile = {
  firstName: "",
  lastName: "",
  initials: "",
  hcp: 0,
  homeClub: "Golf Club Minsk",
  email: "",
  city: "Минск, Беларусь",
  memberSince: String(new Date().getFullYear()),
};

export const useGolf = create<State>()(
  persist(
    (set, get) => ({
      profile: defaultProfile,
      frequent: [],
      rounds: [],
      activeRound: null,

      updateProfile: (p) =>
        set((s) => {
          const merged = { ...s.profile, ...p };
          merged.initials = mkInitials(`${merged.firstName} ${merged.lastName}`);
          return { profile: merged };
        }),

      startRound: (course, players) => {
        const round: Round = {
          id: `r-${Date.now()}`,
          date: new Date().toISOString(),
          courseId: course.id,
          courseName: `${course.name} · ${course.club}`,
          tee: course.tee,
          rating: course.rating,
          slope: course.slope,
          players,
          scores: Object.fromEntries(players.map((p) => [p.id, []])),
          completed: false,
        };
        set({ activeRound: round });
      },

      cancelActiveRound: () => set({ activeRound: null }),

      enterScore: (playerId, score) =>
        set((s) => {
          if (!s.activeRound) return s;
          const list = s.activeRound.scores[playerId] ?? [];
          const existing = list.findIndex((x) => x.hole === score.hole);
          const next = [...list];
          if (existing >= 0) next[existing] = score;
          else next.push(score);
          return {
            activeRound: {
              ...s.activeRound,
              scores: { ...s.activeRound.scores, [playerId]: next },
            },
          };
        }),

      finishRound: () => {
        const a = get().activeRound;
        if (!a) return;
        set((s) => ({
          rounds: [{ ...a, completed: true }, ...s.rounds],
          activeRound: null,
        }));
      },

      addFrequent: (p) =>
        set((s) =>
          s.frequent.find((x) => x.id === p.id) ? s : { frequent: [...s.frequent, p] },
        ),
    }),
    { name: "golfminsk-store" },
  ),
);

export const totalScore = (scores: HoleScore[]) =>
  scores.reduce((acc, s) => acc + (s.score || 0), 0);

export const completedHoles = (scores: HoleScore[]) =>
  scores.filter((s) => s.score > 0).length;
