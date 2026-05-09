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
  username: string;
  initials: string;
  hcp: number;
  homeClub: string;
  email: string;
  city: string;
  memberSince: string;
  photoUrl?: string;
  notificationsEnabled: boolean;
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

let autoSaveTimer: ReturnType<typeof setTimeout> | null = null
function scheduleAutoSave(round: Round) {
  if (autoSaveTimer) clearTimeout(autoSaveTimer)
  autoSaveTimer = setTimeout(() => {
    api.post('/api/rounds', { round }).catch(() => {})
    autoSaveTimer = null
  }, 500)
}

// Flush active round to backend when app is hidden (Telegram close, tab switch, etc.)
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'hidden') return
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

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUUID = (id: string) => UUID_RE.test(id);

const defaultProfile: Profile = {
  firstName: "",
  lastName: "",
  username: "",
  initials: "",
  hcp: 0,
  homeClub: "Golf Club Minsk",
  email: "",
  city: "Минск, Беларусь",
  memberSince: String(new Date().getFullYear()),
  notificationsEnabled: true,
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

      startRound: (course, players, tournamentId, format) => {
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
        };
        set({ activeRound: round });
        // Save to backend immediately so it survives app restarts
        api.post('/api/rounds', { round }).catch(() => {})

        // Always notify: sends tip to current player + notifies any registered participants
        const registeredParticipants = players.filter((p) => !p.isMe && isUUID(p.id));
        api.post('/api/notifications/round-start', {
          playerIds: registeredParticipants.map((p) => p.id),
          courseName: course.name,
        }).catch(() => {});
      },

      cancelActiveRound: () => {
        const round = get().activeRound
        if (round) api.delete(`/api/rounds/${round.id}`).catch(() => {})
        set({ activeRound: null })
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
            return { rounds: completed, activeRound };
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
    }),
    { name: "golfminsk-store" },
  ),
);

export const totalScore = (scores: HoleScore[]) =>
  scores.reduce((acc, s) => acc + (s.score || 0), 0);

export const completedHoles = (scores: HoleScore[]) =>
  scores.filter((s) => s.score > 0).length;
