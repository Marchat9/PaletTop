import { describe, expect, it } from 'vitest';
import { nextActiveIndex } from './input-autocomplete.utils';

describe('nextActiveIndex', () => {
  it('returns -1 when there is no option', () => {
    expect(nextActiveIndex(-1, 0, 1)).toBe(-1);
    expect(nextActiveIndex(2, 0, -1)).toBe(-1);
  });

  it('goes to the first option on ArrowDown from nothing', () => {
    expect(nextActiveIndex(-1, 3, 1)).toBe(0);
  });

  it('goes to the last option on ArrowUp from nothing', () => {
    expect(nextActiveIndex(-1, 3, -1)).toBe(2);
  });

  it('moves down and up', () => {
    expect(nextActiveIndex(0, 3, 1)).toBe(1);
    expect(nextActiveIndex(2, 3, -1)).toBe(1);
  });

  it('wraps at both ends', () => {
    expect(nextActiveIndex(2, 3, 1)).toBe(0);
    expect(nextActiveIndex(0, 3, -1)).toBe(2);
  });

  it('stays on the only option', () => {
    expect(nextActiveIndex(0, 1, 1)).toBe(0);
    expect(nextActiveIndex(0, 1, -1)).toBe(0);
  });
});
