import { describe, expect, it } from 'vitest';
import { setTargetScore } from './friendly-match.actions';
import {
  FriendlyMatchState,
  friendlyMatchReducer,
  initialFriendlyMatchState,
} from './friendly-match.reducer';
import { selectWinner, selectWinnerSide } from './friendly-match.selectors';

function state(overrides: Partial<FriendlyMatchState>): FriendlyMatchState {
  return { ...initialFriendlyMatchState, ...overrides };
}

const root = (s: FriendlyMatchState) => ({ friendlyMatch: s });

describe('friendly match winner', () => {
  it('is decided by the scores, even when the target drops below both', () => {
    const s = state({
      team1Name: 'Rouge',
      team2Name: 'Bleu',
      targetScore: 1,
      team1Score: 2,
      team2Score: 3,
    });
    expect(selectWinnerSide(root(s))).toBe('team2');
    expect(selectWinner(root(s))).toBe('Bleu');
  });

  it('works with empty or identical names', () => {
    const empty = state({
      team1Name: '',
      team2Name: '',
      targetScore: 13,
      team1Score: 13,
      team2Score: 4,
    });
    expect(selectWinner(root(empty))).toBe('Équipe 1');

    const same = state({
      team1Name: 'A',
      team2Name: 'A',
      targetScore: 13,
      team1Score: 4,
      team2Score: 13,
    });
    expect(selectWinnerSide(root(same))).toBe('team2');
  });

  it('has no winner on a tie above the target', () => {
    const s = state({ targetScore: 2, team1Score: 3, team2Score: 3 });
    expect(selectWinnerSide(root(s))).toBeNull();
  });
});

describe('friendly match target score', () => {
  it.each([0, -5, Number.NaN])('ignores an invalid target (%s)', (targetScore) => {
    const next = friendlyMatchReducer(initialFriendlyMatchState, setTargetScore({ targetScore }));
    expect(next.targetScore).toBe(initialFriendlyMatchState.targetScore);
  });

  it('accepts a valid target', () => {
    expect(
      friendlyMatchReducer(initialFriendlyMatchState, setTargetScore({ targetScore: 11 }))
        .targetScore,
    ).toBe(11);
  });
});
