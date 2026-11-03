import { withPendingScore } from './pending-score.util';

describe('withPendingScore', () => {
  const match = { id: 'm1', scoreA: 0, scoreB: 0 };

  it('shows the score typed offline on its match', () => {
    expect(withPendingScore(match, { matchId: 'm1', scoreA: 4, scoreB: 2 })).toEqual({
      id: 'm1',
      scoreA: 4,
      scoreB: 2,
    });
  });

  it('leaves another match untouched', () => {
    expect(withPendingScore(match, { matchId: 'other', scoreA: 4, scoreB: 2 })).toBe(match);
    expect(withPendingScore(match, null)).toBe(match);
  });
});
