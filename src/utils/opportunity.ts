/**
 * Opportunity presentation helpers. Formatting is done manually (no Intl) so
 * output stays deterministic across engines (Hermes) and Jest, matching the
 * approach in {@link ./time}.
 */

/** Brazilian currency, whole reais: 48000 -> "R$ 48.000". */
export const formatCurrency = (value: number): string => {
  const rounded = Math.round(value);
  const digits = Math.abs(rounded)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `R$ ${rounded < 0 ? '-' : ''}${digits}`;
};

export type StageAgeSeverity = 'ok' | 'warn' | 'late';

export interface StageAge {
  days: number;
  label: string;
  severity: StageAgeSeverity;
}

/** How long an opp has sat in its current stage, with a severity for the
 * escalating color badge (≥7 days = late, ≥3 = warn). */
export const stageAge = (stageEnteredAt: number, now: number = Date.now()): StageAge => {
  const days = Math.max(0, Math.floor((now - stageEnteredAt) / (24 * 60 * 60 * 1000)));
  const severity: StageAgeSeverity = days >= 7 ? 'late' : days >= 3 ? 'warn' : 'ok';
  const label = days === 0 ? 'hoje' : `${days}d na etapa`;
  return { days, label, severity };
};
