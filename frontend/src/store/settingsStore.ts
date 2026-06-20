import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Language = "en" | "ru";
export type Theme = "dark" | "light";
export type StatsMode = "all" | "last";

type SettingsState = {
  language: Language;
  theme: Theme;
  statsMode: StatsMode;
  setLanguage: (lang: Language) => void;
  setTheme: (theme: Theme) => void;
  setStatsMode: (mode: StatsMode) => void;
};

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      language: "en",
      theme: "dark",
      statsMode: "all",
      setLanguage: (language) => {
        set({ language });
        // Apply theme to document
        if (language === "ru") {
          // Future: apply translations
        }
      },
      setTheme: (theme) => {
        set({ theme });
        // Apply theme to document
        if (theme === "light") {
          document.documentElement.setAttribute("data-theme", "light");
        } else {
          document.documentElement.removeAttribute("data-theme");
        }
      },
      setStatsMode: (statsMode) => set({ statsMode }),
    }),
    {
      name: "golf-settings",
    }
  )
);

// Apply theme on initial load
const initialTheme = useSettings.getState().theme;
if (initialTheme === "light") {
  document.documentElement.setAttribute("data-theme", "light");
}
