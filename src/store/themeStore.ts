import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

/** How the app resolves its color scheme. 'system' defers to the OS setting. */
export type ThemePreference = 'system' | 'light' | 'dark';

interface ThemeState {
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
}

/**
 * Persisted theme preference — the single source of truth for light/dark.
 * Decoupled from any screen on purpose: the Settings selector (or any future
 * config screen) only reads/writes this store, while {@link useThemeSync}
 * applies it to NativeWind. Relocating the toggle never touches this engine.
 */
export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      preference: 'system',
      setPreference: (preference) => set({ preference }),
    }),
    {
      name: 'nexus-theme',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
