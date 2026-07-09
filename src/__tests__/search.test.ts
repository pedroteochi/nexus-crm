import { matchesQuery, normalizeSearch } from '@/utils/search';

describe('normalizeSearch', () => {
  it('lowercases, trims and strips accents', () => {
    expect(normalizeSearch('  José  ')).toBe('jose');
    expect(normalizeSearch('Qualificação')).toBe('qualificacao');
    expect(normalizeSearch('SÃO PAULO')).toBe('sao paulo');
  });
});

describe('matchesQuery', () => {
  it('is accent- and case-insensitive', () => {
    expect(matchesQuery('José Antônio', 'jose')).toBe(true);
    expect(matchesQuery('Acme Analytics', 'ACME')).toBe(true);
    expect(matchesQuery('Sofia Rossi', 'rossi')).toBe(true);
  });

  it('requires every term to be present (AND)', () => {
    expect(matchesQuery('Sofia Rossi · Gerente de Frota', 'sofia frota')).toBe(true);
    expect(matchesQuery('Sofia Rossi · Gerente de Frota', 'sofia vendas')).toBe(false);
  });

  it('treats an empty or whitespace query as a match-all', () => {
    expect(matchesQuery('qualquer coisa', '')).toBe(true);
    expect(matchesQuery('qualquer coisa', '   ')).toBe(true);
  });

  it('returns false when the term is absent', () => {
    expect(matchesQuery('Olivia Bennett', 'marcus')).toBe(false);
  });
});
