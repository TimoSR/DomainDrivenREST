import { create } from "zustand";

export type Theme = "dark" | "light";

import { STORAGE_KEYS } from "../_critical/uiDefaults";

const THEME_KEY = STORAGE_KEYS.theme;

function readTheme(): Theme {
  try {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored === "dark" || stored === "light") return stored;
  } catch {
    // Private mode / blocked site data — fall through to the default.
  }
  return "dark";
}

function applyTheme(theme: Theme) {
  document.documentElement.setAttribute("data-theme", theme);
}

interface UiState {
  theme: Theme;
  paletteOpen: boolean;
  toggleTheme: () => void;
  setPaletteOpen: (open: boolean) => void;
}

export const useUiStore = create<UiState>((set, get) => ({
  theme: readTheme(),
  paletteOpen: false,

  toggleTheme: () => {
    const next: Theme = get().theme === "dark" ? "light" : "dark";
    applyTheme(next);
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {
      // Persisting the preference is best-effort.
    }
    set({ theme: next });
  },

  setPaletteOpen: (paletteOpen) => set({ paletteOpen }),
}));

applyTheme(useUiStore.getState().theme);
