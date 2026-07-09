/**
 * Chrome colors for the JS-side surfaces that can't use `dark:` classes —
 * navigation header, tab bar, status bar and icon `color` props.
 *
 * NativeWind `className` colors follow this convention (applied as `dark:`
 * variants across the components):
 *   page bg     bg-white        -> dark:bg-zinc-950
 *   surface/card bg-white/zinc-50 -> dark:bg-zinc-900 / dark:bg-zinc-800
 *   primary text text-zinc-900   -> dark:text-zinc-50
 *   muted text  text-zinc-500/600-> dark:text-zinc-400
 *   faint text  text-zinc-400    -> dark:text-zinc-500
 *   border      border-zinc-200  -> dark:border-zinc-800
 */
export interface ChromeColors {
  background: string;
  surface: string;
  border: string;
  textPrimary: string;
  textMuted: string;
  tint: string;
  tabInactive: string;
  iconMuted: string;
}

export const CHROME: Record<'light' | 'dark', ChromeColors> = {
  light: {
    background: '#ffffff',
    surface: '#ffffff',
    border: '#e4e4e7', // zinc-200
    textPrimary: '#18181b', // zinc-900
    textMuted: '#71717a', // zinc-500
    tint: '#4f46e5', // indigo-600 (brand)
    tabInactive: '#71717a',
    iconMuted: '#a1a1aa', // zinc-400
  },
  dark: {
    background: '#09090b', // zinc-950
    surface: '#18181b', // zinc-900
    border: '#27272a', // zinc-800
    textPrimary: '#fafafa', // zinc-50
    textMuted: '#a1a1aa', // zinc-400
    tint: '#818cf8', // indigo-400 (softer on dark)
    tabInactive: '#a1a1aa',
    iconMuted: '#71717a', // zinc-500
  },
};
