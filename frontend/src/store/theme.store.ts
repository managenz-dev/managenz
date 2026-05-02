// Light-only theme store — dark mode removed entirely.
// isDark is always false. toggleTheme is a no-op kept for backwards compatibility.
import { create } from "zustand";

interface ThemeState {
  isDark: boolean;
  toggleTheme: () => void;
  setDark: (v: boolean) => void;
}

export const useThemeStore = create<ThemeState>()(() => ({
  isDark: false,
  toggleTheme: () => {}, // no-op — light only
  setDark: () => {},     // no-op — light only
}));