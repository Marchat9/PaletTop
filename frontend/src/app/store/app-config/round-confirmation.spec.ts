import { describe, expect, it } from 'vitest';
import {
  isRoundConfirmationSkipped,
  ROUND_CONFIRMATION_SKIP_TTL_MS,
  skipRoundConfirmationKey,
  withoutExpiredRoundSkips,
} from './round-confirmation';

const NOW = Date.UTC(2026, 10, 27, 12);

describe('skipRoundConfirmationKey', () => {
  it('gives each tournament and each session its own key', () => {
    expect(skipRoundConfirmationKey('tournament', 'ABCD')).toBe(
      'skipRoundConfirmation.tournament.ABCD',
    );
    expect(skipRoundConfirmationKey('training', 'ABCD')).toBe(
      'skipRoundConfirmation.training.ABCD',
    );
  });
});

describe('isRoundConfirmationSkipped', () => {
  const key = skipRoundConfirmationKey('tournament', 'ABCD');

  it('asks until the admin opts out', () => {
    expect(isRoundConfirmationSkipped({}, 'tournament', 'ABCD', NOW)).toBe(false);
  });

  it('skips within 24 hours of the opt-out', () => {
    const data = { [key]: NOW - ROUND_CONFIRMATION_SKIP_TTL_MS + 1 };

    expect(isRoundConfirmationSkipped(data, 'tournament', 'ABCD', NOW)).toBe(true);
  });

  it('asks again 24 hours after the opt-out', () => {
    const data = { [key]: NOW - ROUND_CONFIRMATION_SKIP_TTL_MS };

    expect(isRoundConfirmationSkipped(data, 'tournament', 'ABCD', NOW)).toBe(false);
  });

  it('keeps tournaments and sessions apart', () => {
    const data = { [key]: NOW };

    expect(isRoundConfirmationSkipped(data, 'training', 'ABCD', NOW)).toBe(false);
    expect(isRoundConfirmationSkipped(data, 'tournament', 'ZZZZ', NOW)).toBe(false);
  });

  it('ignores a stored value that is not a date', () => {
    expect(isRoundConfirmationSkipped({ [key]: 'oops' }, 'tournament', 'ABCD', NOW)).toBe(false);
  });
});

describe('withoutExpiredRoundSkips', () => {
  it('drops the expired or malformed opt-outs and keeps everything else', () => {
    const fresh = skipRoundConfirmationKey('tournament', 'ABCD');
    const expired = skipRoundConfirmationKey('training', '1234');
    const malformed = skipRoundConfirmationKey('training', '5678');
    const data = {
      [fresh]: NOW - 1000,
      [expired]: NOW - ROUND_CONFIRMATION_SKIP_TTL_MS - 1,
      [malformed]: 'oops',
      'tournament-code': 'ABCD',
    };

    expect(withoutExpiredRoundSkips(data, NOW)).toEqual({
      [fresh]: NOW - 1000,
      'tournament-code': 'ABCD',
    });
  });
});
