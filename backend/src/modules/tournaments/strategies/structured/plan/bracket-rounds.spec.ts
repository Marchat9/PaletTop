import { describe, expect, it } from 'vitest';
import { bracketRounds, fillLevel } from './bracket-rounds';

describe('bracketRounds', () => {
    it('brings best losers back after a partial first round', () => {
        const rounds = bracketRounds(24, 32);
        expect(rounds[0]).toEqual({ teams: 24, matches: 12, byes: 0, losers: 12, bestLosersIn: 4 });
        expect(rounds[1].teams).toBe(16);
    });

    it('gives a bye to the odd team', () => {
        expect(bracketRounds(21, 32)[0].byes).toBe(1);
    });

    it('plays a single final for two teams', () => {
        expect(bracketRounds(2, 2)).toEqual([
            { teams: 2, matches: 1, byes: 0, losers: 1, bestLosersIn: 0 },
        ]);
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
