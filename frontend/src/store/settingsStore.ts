import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Language = "en" | "ru";
export type StatsMode = "all" | "last";

type SettingsState = {
  language: Language;
  statsMode: StatsMode;
  setLanguage: (lang: Language) => void;
  setStatsMode: (mode: StatsMode) => void;
};

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      language: "en",
      statsMode: "all",
      setLanguage: (language) => set({ language }),
      setStatsMode: (statsMode) => set({ statsMode }),
    }),
    {
      name: "golf-settings",
    }
  )
);
