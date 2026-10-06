import { isValidCode } from './code-format.util';

describe('isValidCode', () => {
  it.each(['PALET-2026', 'OPEN DE NANTES', 'CLUB_A 2', 'abc'])('accepts "%s"', (code) => {
    expect(isValidCode(code)).toBe(true);
  });

  it.each(['A/B', 'CODE?', 'É-2026', 'PALET#1', '', '   '])('refuses "%s"', (code) => {
    expect(isValidCode(code)).toBe(false);
  });
});
