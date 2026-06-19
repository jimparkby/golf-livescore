import { create } from "zustand";
import { persist } from "zustand/middleware";
import { COURSES, type Course, type TeeColor } from "@/lib/courses";
import { type FormatId } from "@/lib/formats";
import { api } from "@/lib/api";

export type Player = {
  id: string;
  name: string;
  initials: string;
  hcp: number;
  tee?: TeeColor;
  isMe?: boolean;
  photoUrl?: string;
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
  madeBy?: string;
};

export type HolesMode = "18" | "front9" | "back9";

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
  completedAt?: string;
  updatedAt?: string;
  tournamentId?: string;
  format?: FormatId;
  photoUrl?: string;
  currentHoleIndex?: number;
  holesMode?: HolesMode;
  teams?: [string[], string[]];
};

export type Profile = {
  firstName: string;
  lastName: string;
  username: string;
  initials: string;
  hcp: number;
  homeClub: string;
  email: string;
  city: string;
  memberSince: string;
  photoUrl?: string;
  defaultTee: TeeColor;
};

export type CustomTournament = {
  id: string;
  name: string;
  date: string;
  day: string;
  month: string;
  format: FormatId;
  courseId?: string;
  holesMode?: HolesMode;
  teams?: [string[], string[]];
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
  resetStore: () => void;
  startRound: (course: Course, players: Player[], tournamentId?: string, format?: FormatId, holesMode?: HolesMode, teams?: [string[], string[]]) => void;
  cancelActiveRound: () => void;
  enterScore: (playerId: string, score: HoleScore) => void;
  finishRound: () => void;
  deleteRound: (id: string) => void;
  setRoundPhoto: (id: string, photoUrl: string) => void;
  addFrequent: (p: Player) => void;
  addCustomTournament: (t: Omit<CustomTournament, "createdAt">) => void;
  deleteCustomTournament: (id: string) => void;
  setCurrentHole: (idx: number) => void;
  addRound: (round: Round) => void;
  loadRounds: () => Promise<void>;
  syncRound: (round: Round) => Promise<void>;
  refreshActiveRound: () => Promise<void>;
  notifyPlayers: (roundId: string) => Promise<void>;
};

const mkInitials = (name: string) =>
  name.split(" ").map((p) => p[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUUID = (id: string) => UUID_RE.test(id);

let autoSaveTimer: ReturnType<typeof setTimeout> | null = null
function scheduleAutoSave(round: Round) {
  if (autoSaveTimer) clearTimeout(autoSaveTimer)
  autoSaveTimer = setTimeout(() => {
    api.post('/api/rounds', { round }).catch(() => {})
    autoSaveTimer = null
  }, 500)
}

// Flush active round to backend when app is hidden (Telegram close, tab switch, etc.)
// Reload rounds when app regains visibility (handles Telegram cached WebView resume)
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      if (localStorage.getItem('golf_jwt')) {
        useGolf.getState().loadRounds().catch(() => {})
      }
      return
    }
    const round = useGolf.getState().activeRound
    if (!round) return
    if (autoSaveTimer) { clearTimeout(autoSaveTimer); autoSaveTimer = null }
    const token = localStorage.getItem('golf_jwt')
    const base = import.meta.env.VITE_BACKEND_URL ? `https://${import.meta.env.VITE_BACKEND_URL}` : ''
    fetch(`${base}/api/rounds`, {
      method: 'POST',
      keepalive: true,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ round }),
    }).catch(() => {})
  })
}


const defaultProfile: Profile = {
  firstName: "",
  lastName: "",
  username: "",
  initials: "",
  hcp: 0,
  homeClub: "Golf Club Minsk",
  email: "",
  city: "Minsk, Belarus",
  memberSince: String(new Date().getFullYear()),
  defaultTee: "yellow",
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

      resetStore: () =>
        set({ profile: defaultProfile, frequent: [], rounds: [], activeRound: null, customTournaments: [] }),

      startRound: (course, players, tournamentId, format, holesMode, teams) => {
        const mePlayer = players.find((p) => p.isMe);
        const teeColor: TeeColor = mePlayer?.tee ?? "yellow";
        const teeInfo = course.tees.find((t) => t.color === teeColor) ?? course.tees[2] ?? course.tees[0];
        const round: Round = {
          id: `r-${Date.now()}`,
          date: new Date().toISOString(),
          courseId: course.id,
          courseName: `${course.name} · ${course.club}`,
          tee: teeInfo.label,
          rating: teeInfo.rating,
          slope: teeInfo.slope,
          players,
          scores: Object.fromEntries(players.map((p) => [p.id, []])),
          completed: false,
          tournamentId,
          format,
          holesMode: holesMode ?? "18",
          teams,
        };
        set({ activeRound: round });
        // Save to backend immediately so it survives app restarts
        api.post('/api/rounds', { round }).then(() => {
          // Notify other players after round is saved
          if (players.some(p => !p.isMe && isUUID(p.id))) {
            api.post(`/api/rounds/${round.id}/notify`, {}).catch(() => {})
          }
        }).catch(() => {})

      },

      cancelActiveRound: () => {
        const round = get().activeRound
        if (round) api.delete(`/api/rounds/${round.id}`).catch(() => {})
        set({ activeRound: null })
      },

      setCurrentHole: (idx) => {
        set((s) => s.activeRound ? { activeRound: { ...s.activeRound, currentHoleIndex: idx } } : s);
      },

      enterScore: (playerId, score) => {
        set((s) => {
          if (!s.activeRound) return s;
          const list = s.activeRound.scores[playerId] ?? [];
          const existing = list.findIndex((x) => x.hole === score.hole);
          const next = [...list];
          if (existing >= 0) next[existing] = score;
          else next.push(score);
          return { activeRound: { ...s.activeRound, scores: { ...s.activeRound.scores, [playerId]: next } } };
        });
        const updated = get().activeRound
        if (updated) scheduleAutoSave(updated)
      },

      finishRound: async () => {
        const a = get().activeRound;
        if (!a) return;
        const holesPlayed = Object.values(a.scores).flat().length;
        if (holesPlayed === 0) {
          // No scores entered — discard instead of saving an empty round
          try {
            await api.delete(`/api/rounds/${a.id}`);
          } catch (err) {
            console.error('Failed to discard empty round:', err);
          }
          set({ activeRound: null });
          return;
        }
        const completedRound = { ...a, completed: true, completedAt: new Date().toISOString() };
        set((s) => ({ rounds: [completedRound, ...s.rounds], activeRound: null }));

        // Синхронизируем с сервером
        try {
          await get().syncRound(completedRound);
        } catch (err) {
          console.error('Failed to sync round:', err);
        }
      },

      addRound: (round) => {
        set((s) => ({ rounds: [round, ...s.rounds.filter((r) => r.id !== round.id)] }));
      },

      deleteRound: async (id) => {
        const deletedRound = get().rounds.find((r) => r.id === id);
        if (!deletedRound) return;

        // Optimistically remove from state
        set((s) => ({ rounds: s.rounds.filter((r) => r.id !== id) }));

        try {
          await api.delete(`/api/rounds/${id}`);
        } catch (err) {
          console.error('Failed to delete round:', err);
          // Rollback: restore the round if delete failed
          set((s) => ({ rounds: [deletedRound, ...s.rounds] }));
          throw err; // Re-throw so caller can show error toast
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
            { ...t, createdAt: new Date().toISOString() },
            ...s.customTournaments,
          ],
        })),

      deleteCustomTournament: (id) =>
        set((s) => ({ customTournaments: s.customTournaments.filter((t) => t.id !== id) })),

      loadRounds: async () => {
        try {
          const allRounds = await api.get<Round[]>('/api/rounds');
          const completed = allRounds.filter(r => r.completed);
          const incomplete = allRounds.find(r => !r.completed) ?? null;
          set((s) => {
            // Prefer DB version of active round — it has the latest scores
            // even if localStorage was cleared by Telegram WebView restart
            const local = s.activeRound;
            let activeRound = incomplete ?? local ?? null;
            // If both exist, use whichever has more scores (more up-to-date)
            if (local && incomplete) {
              const localScores = Object.values(local.scores).flat().length;
              const dbScores = Object.values(incomplete.scores).flat().length;
              activeRound = dbScores >= localScores ? incomplete : local;
            }
            // Keep locally-added rounds not yet in this server response (race condition guard)
            const serverIds = new Set(completed.map(r => r.id));
            const notYetSynced = s.rounds.filter(r => r.completed && !serverIds.has(r.id));
            return { rounds: [...completed, ...notYetSynced], activeRound };
          });
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

      refreshActiveRound: async () => {
        const round = get().activeRound;
        if (!round) return;
        try {
          const fresh = await api.get<Round>(`/api/rounds/${round.id}`);
          // Merge: keep our scores for "me" player, take DB scores for others
          const meId = round.players.find(p => p.isMe)?.id;
          const mergedScores: Record<string, typeof round.scores[string]> = { ...fresh.scores };
          if (meId && round.scores[meId]) {
            mergedScores[meId] = round.scores[meId];
          }
          set((s) => s.activeRound?.id === round.id
            ? { activeRound: { ...fresh, scores: mergedScores, players: s.activeRound.players } }
            : s
          );
        } catch {
          // silently ignore — we still have local state
        }
      },

      notifyPlayers: async (roundId: string) => {
        try {
          await api.post(`/api/rounds/${roundId}/notify`, {});
        } catch {
          // non-critical — don't throw
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
