import { useEffect } from 'react';
import { useColorScheme } from 'nativewind';

import { useThemeStore } from '@/store/themeStore';

/**
 * Applies the persisted theme preference to NativeWind's color scheme.
 * Mount once at the app root; the whole tree then reacts to `dark:` variants.
 * Passing 'system' hands control back to the OS setting.
 */
export const useThemeSync = (): void => {
  const preference = useThemeStore((state) => state.preference);
  const { setColorScheme } = useColorScheme();

  useEffect(() => {
    setColorScheme(preference);
  }, [preference, setColorScheme]);
};
