import { describe, expect, it } from 'vitest';
import { bracketRounds, fillLevel } from './bracket-rounds';

describe('bracketRounds', () => {
    it('12 teams in 16 slots: 4 matches and 4 byes first, then full rounds', () => {
        expect(bracketRounds(12, 16)).toEqual([
            { teams: 12, matches: 4, byes: 4, losers: 4 },
            { teams: 8, matches: 4, byes: 0, losers: 4 },
            { teams: 4, matches: 2, byes: 0, losers: 2 },
            { teams: 2, matches: 1, byes: 0, losers: 1 },
        ]);
    });

    it('a full bracket has no bye', () => {
        expect(bracketRounds(8, 8)).toEqual([
            { teams: 8, matches: 4, byes: 0, losers: 4 },
            { teams: 4, matches: 2, byes: 0, losers: 2 },
            { teams: 2, matches: 1, byes: 0, losers: 1 },
        ]);
    });

    it('5 teams in 8 slots: one match and three byes', () => {
        expect(bracketRounds(5, 8)[0]).toEqual({ teams: 5, matches: 1, byes: 3, losers: 1 });
    });

    it('24 teams in 32 slots: 8 matches and 8 byes', () => {
        const rounds = bracketRounds(24, 32);
        expect(rounds[0]).toEqual({ teams: 24, matches: 8, byes: 8, losers: 8 });
        expect(rounds[1].teams).toBe(16);
    });

    it('plays a single final for two teams', () => {
        expect(bracketRounds(2, 2)).toEqual([{ teams: 2, matches: 1, byes: 0, losers: 1 }]);
    });
});

describe('fillLevel', () => {
    const thresholds = { okRatio: 0.9, warningRatio: 0.75 };

    it('classifies the fill ratio', () => {
        expect(fillLevel(29, 32, thresholds)).toBe('ok');
        expect(fillLevel(24, 32, thresholds)).toBe('mid');
        expect(fillLevel(17, 32, thresholds)).toBe('low');
    });

    it('reads the thresholds from its argument', () => {
        expect(fillLevel(17, 32, { okRatio: 0.5, warningRatio: 0.4 })).toBe('ok');
    });
});
