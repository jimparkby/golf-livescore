import { create } from "zustand";
import { persist } from "zustand/middleware";
import { COURSES, type Course } from "@/lib/courses";
import { type FormatId } from "@/lib/formats";
import { api } from "@/lib/api";

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
  driving: boolean;
  gir: boolean;
  bunker: number;
  penalties: number;
  teeShot?: "fairway" | "left" | "right" | "long" | "short" | "miss";
};

export type Round = {
  id: string;
  date: string;
  courseId: string;
  courseName: string;
  tee: string;
  rating: number;
  slope: number;
  players: Player[];
  scores: Record<string, HoleScore[]>;
  completed: boolean;
  tournamentId?: string;
  format?: FormatId;
  photoUrl?: string;
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
  photoUrl?: string;
};

export type CustomTournament = {
  id: string;
  name: string;
  date: string;
  day: string;
  month: string;
  format: FormatId;
  courseId?: string;
  notes?: string;
  createdAt: string;
};

export type FrequentPlayer = Player;

type State = {
  profile: Profile;
  frequent: FrequentPlayer[];
  rounds: Round[];
  activeRound: Round | null;
  customTournaments: CustomTournament[];
  updateProfile: (p: Partial<Profile>) => void;
  startRound: (course: Course, players: Player[], tournamentId?: string, format?: FormatId) => void;
  cancelActiveRound: () => void;
  enterScore: (playerId: string, score: HoleScore) => void;
  finishRound: () => void;
  deleteRound: (id: string) => void;
  setRoundPhoto: (id: string, photoUrl: string) => void;
  addFrequent: (p: Player) => void;
  addCustomTournament: (t: Omit<CustomTournament, "id" | "createdAt">) => void;
  deleteCustomTournament: (id: string) => void;
  loadRounds: () => Promise<void>;
  syncRound: (round: Round) => Promise<void>;
};

const mkInitials = (name: string) =>
  name.split(" ").map((p) => p[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();

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
      customTournaments: [],

      updateProfile: (p) =>
        set((s) => {
          const merged = { ...s.profile, ...p };
          merged.initials = mkInitials(`${merged.firstName} ${merged.lastName}`);
          return { profile: merged };
        }),

      startRound: (course, players, tournamentId, format) => {
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
          tournamentId,
          format,
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
          return { activeRound: { ...s.activeRound, scores: { ...s.activeRound.scores, [playerId]: next } } };
        }),

      finishRound: async () => {
        const a = get().activeRound;
        if (!a) return;
        const completedRound = { ...a, completed: true };
        set((s) => ({ rounds: [completedRound, ...s.rounds], activeRound: null }));

        // Синхронизируем с сервером
        try {
          await get().syncRound(completedRound);
        } catch (err) {
          console.error('Failed to sync round:', err);
        }
      },

      deleteRound: async (id) => {
        set((s) => ({ rounds: s.rounds.filter((r) => r.id !== id) }));
        try {
          await api.delete(`/api/rounds/${id}`);
        } catch (err) {
          console.error('Failed to delete round:', err);
        }
      },

      setRoundPhoto: async (id, photoUrl) => {
        set((s) => ({ rounds: s.rounds.map((r) => r.id === id ? { ...r, photoUrl } : r) }));
        try {
          await api.put(`/api/rounds/${id}/photo`, { photoUrl });
        } catch (err) {
          console.error('Failed to update photo:', err);
        }
      },

      addFrequent: (p) =>
        set((s) => s.frequent.find((x) => x.id === p.id) ? s : { frequent: [...s.frequent, p] }),

      addCustomTournament: (t) =>
        set((s) => ({
          customTournaments: [
            { ...t, id: `ct-${Date.now()}`, createdAt: new Date().toISOString() },
            ...s.customTournaments,
          ],
        })),

      deleteCustomTournament: (id) =>
        set((s) => ({ customTournaments: s.customTournaments.filter((t) => t.id !== id) })),

      loadRounds: async () => {
        try {
          const rounds = await api.get<Round[]>('/api/rounds');
          set({ rounds });
        } catch (err) {
          console.error('Failed to load rounds:', err);
        }
      },

      syncRound: async (round: Round) => {
        try {
          await api.post('/api/rounds', { round });
        } catch (err) {
          console.error('Failed to sync round:', err);
          throw err;
        }
      },
    }),
    { name: "golfminsk-store" },
  ),
);

export const totalScore = (scores: HoleScore[]) =>
  scores.reduce((acc, s) => acc + (s.score || 0), 0);

export const completedHoles = (scores: HoleScore[]) =>
  scores.filter((s) => s.score > 0).length;
