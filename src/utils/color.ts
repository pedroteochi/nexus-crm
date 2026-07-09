/**
 * Deterministically map a string (typically a name) to a pleasant, high-contrast
 * background color. The same input always yields the same color, so avatars stay
 * stable across renders and app launches without persisting anything.
 */
const PALETTE: readonly string[] = [
  '#4f46e5', // indigo
  '#0ea5e9', // sky
  '#059669', // emerald
  '#d97706', // amber
  '#db2777', // pink
  '#7c3aed', // violet
  '#0891b2', // cyan
  '#e11d48', // rose
  '#4338ca', // deep indigo
  '#0d9488', // teal
];

const FALLBACK = '#4f46e5';

export const colorFromString = (input: string): string => {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0; // force 32-bit integer
  }
  const index = Math.abs(hash) % PALETTE.length;
  return PALETTE[index] ?? FALLBACK;
};
