import { formatCurrency, stageAge } from '@/utils/opportunity';

const DAY = 24 * 60 * 60 * 1000;

describe('formatCurrency', () => {
  it('groups thousands with dots and prefixes R$', () => {
    expect(formatCurrency(48000)).toBe('R$ 48.000');
    expect(formatCurrency(1500000)).toBe('R$ 1.500.000');
    expect(formatCurrency(999)).toBe('R$ 999');
    expect(formatCurrency(0)).toBe('R$ 0');
  });

  it('rounds to whole reais', () => {
    expect(formatCurrency(1500.6)).toBe('R$ 1.501');
    expect(formatCurrency(1500.4)).toBe('R$ 1.500');
  });

  it('keeps the minus sign before the grouped digits', () => {
    expect(formatCurrency(-1200)).toBe('R$ -1.200');
  });
});

describe('stageAge', () => {
  const now = 10 * DAY;

  it('labels a same-day entry as "hoje" with ok severity', () => {
    expect(stageAge(now, now)).toEqual({ days: 0, label: 'hoje', severity: 'ok' });
  });

  it('stays ok below 3 days', () => {
    expect(stageAge(now - 2 * DAY, now)).toEqual({
      days: 2,
      label: '2d na etapa',
      severity: 'ok',
    });
  });

  it('escalates to warn at 3 days and late at 7 days', () => {
    expect(stageAge(now - 3 * DAY, now).severity).toBe('warn');
    expect(stageAge(now - 6 * DAY, now).severity).toBe('warn');
    expect(stageAge(now - 7 * DAY, now).severity).toBe('late');
    expect(stageAge(now - 12 * DAY, now).severity).toBe('late');
  });

  it('clamps a future entry timestamp to 0 days rather than going negative', () => {
    expect(stageAge(now + 5 * DAY, now)).toEqual({ days: 0, label: 'hoje', severity: 'ok' });
  });
});
