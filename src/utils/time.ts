/**
 * Small, locale-independent time formatters. We format manually instead of using
 * Intl/toLocaleString so output stays deterministic across engines (Hermes) and
 * inside Jest's fake-timer environment.
 */
const pad = (value: number): string => value.toString().padStart(2, '0');

/** 24-hour clock time, e.g. "09:05" — used inside chat bubbles. */
export const formatClockTime = (timestamp: number): string => {
  const date = new Date(timestamp);
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

/** Compact "time ago" label, e.g. "agora", "5min", "3h", "2d", "4sem" — used in lists. */
export const formatRelativeTime = (timestamp: number, now: number = Date.now()): string => {
  const diffMs = Math.max(0, now - timestamp);
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return 'agora';
  if (minutes < 60) return `${minutes}min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  const weeks = Math.floor(days / 7);
  return `${weeks}sem`;
};
