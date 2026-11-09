import { describe, expect, it } from 'vitest';
import { ScoreEntryBase } from './stale-score.util';

const onScreen = (scoreA: number, scoreB: number) => ({ id: 'm1', scoreA, scoreB });

describe('ScoreEntryBase', () => {
  it("keeps the score of the burst's first click, even once the opponent's point arrived", () => {
    const entry = new ScoreEntryBase();

    expect(entry.atClick('m1', onScreen(5, 4))).toEqual({ scoreA: 5, scoreB: 4 });
    // The opponent's point is received while the burst is still being typed.
    expect(entry.atClick('m1', onScreen(6, 4))).toEqual({ scoreA: 5, scoreB: 4 });
  });

  it('starts the next burst from the screen once the previous one is answered', () => {
    const entry = new ScoreEntryBase();
    entry.atClick('m1', onScreen(5, 4));
    entry.sent({ matchId: 'm1', scoreA: 5, scoreB: 5 });
    entry.answered({ matchId: 'm1', scoreA: 5, scoreB: 5 });

    expect(entry.atClick('m1', onScreen(6, 5))).toEqual({ scoreA: 6, scoreB: 5 });
  });

  it('starts the next burst from the score sent when it is not answered yet', () => {
    const entry = new ScoreEntryBase();
    entry.atClick('m1', onScreen(5, 4));
    entry.sent({ matchId: 'm1', scoreA: 6, scoreB: 4 });

    // The screen still shows the old score: the request has not come back.
    expect(entry.atClick('m1', onScreen(5, 4))).toEqual({ scoreA: 6, scoreB: 4 });
  });

  it('ignores the answer of an older request once a newer one is sent', () => {
    const entry = new ScoreEntryBase();
    entry.sent({ matchId: 'm1', scoreA: 6, scoreB: 4 });
    entry.sent({ matchId: 'm1', scoreA: 7, scoreB: 4 });
    entry.answered({ matchId: 'm1', scoreA: 6, scoreB: 4 });

    expect(entry.atClick('m1', onScreen(6, 4))).toEqual({ scoreA: 7, scoreB: 4 });
  });

  it('has no base for a match that is not on screen', () => {
    expect(new ScoreEntryBase().atClick('m2', onScreen(5, 4))).toBeNull();
  });
});
