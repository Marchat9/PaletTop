import { isSessionCode, isValidCode, normalizeCode } from './code-format.util';

describe('isValidCode', () => {
  it.each(['PALET-2026', 'OPEN DE NANTES', 'CLUB_A 2', 'abc'])('accepts "%s"', (code) => {
    expect(isValidCode(code)).toBe(true);
  });

  it.each(['A/B', 'CODE?', 'É-2026', 'PALET#1', '', '   '])('refuses "%s"', (code) => {
    expect(isValidCode(code)).toBe(false);
  });
});

describe('normalizeCode', () => {
  it('matches the stored form of a code: trimmed and upper case', () => {
    expect(normalizeCode('  palet 2026 ')).toBe('PALET 2026');
  });
});

describe('isSessionCode', () => {
  it('accepts the 6-digit codes and the older 4-digit ones', () => {
    expect(isSessionCode('123456')).toBe(true);
    expect(isSessionCode('1234')).toBe(true);
  });

  it.each(['12345', '1234567', 'abcdef', '', null])('rejects "%s"', (code) => {
    expect(isSessionCode(code)).toBe(false);
  });
});
