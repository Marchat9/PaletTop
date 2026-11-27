import { describe, expect, it } from 'vitest';
import { SkipRoundConfirmation, withSkippedRound } from './round-confirmation';

const EMPTY: SkipRoundConfirmation = { tournament: [], training: [] };

describe('withSkippedRound', () => {
  it('adds the code to its own scope only', () => {
    expect(withSkippedRound(EMPTY, 'tournament', '1234')).toEqual({
      tournament: ['1234'],
      training: [],
    });
    expect(withSkippedRound(EMPTY, 'training', '1234')).toEqual({
      tournament: [],
      training: ['1234'],
    });
  });

  it('keeps the codes already stored, without duplicates', () => {
    const current: SkipRoundConfirmation = { tournament: ['1234'], training: ['A1'] };

    expect(withSkippedRound(current, 'tournament', '5678')).toEqual({
      tournament: ['1234', '5678'],
      training: ['A1'],
    });
    expect(withSkippedRound(current, 'tournament', '1234')).toEqual(current);
  });

  it('leaves its input untouched', () => {
    const current: SkipRoundConfirmation = { tournament: ['1234'], training: [] };

    withSkippedRound(current, 'tournament', '5678');

    expect(current).toEqual({ tournament: ['1234'], training: [] });
  });
});
