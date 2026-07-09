import { useColorScheme } from 'nativewind';

import { CHROME, type ChromeColors } from '@/theme/palette';

/**
 * Resolves the active chrome palette for JS-side color props (navigation,
 * status bar, icon `color`). Tracks NativeWind's color scheme, so it flips
 * with the theme — including when the preference is 'system'.
 */
export const useThemeColors = (): ChromeColors =>
  CHROME[useColorScheme().colorScheme === 'dark' ? 'dark' : 'light'];
