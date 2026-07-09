/**
 * Search helpers. Matching is accent- and case-insensitive so "jose" finds
 * "José" and "sofia" finds "Sofia" — expected for pt-BR names. Diacritics are
 * stripped via NFD + the combining-marks range (Hermes-safe, no \p{} escapes).
 */
export const normalizeSearch = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();

/** True when every whitespace-separated term in `query` appears in `haystack`. */
export const matchesQuery = (haystack: string, query: string): boolean => {
  const normalizedQuery = normalizeSearch(query);
  if (!normalizedQuery) return true;
  const target = normalizeSearch(haystack);
  return normalizedQuery.split(/\s+/).every((term) => target.includes(term));
};
