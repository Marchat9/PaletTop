import { describe, expect, it } from 'vitest';
import { ScoreCalculation } from 'src/enum/tounament.enum';
import { computeEntryScore } from './score-calculation.utils';

function entry(pointsFor: number, goalAverage: number, wins = 0) {
    return { pointsFor, goalAverage, wins, tournamentPoints: 0 };
}

describe('computeEntryScore — somme des scores', () => {
    const score = (pointsFor: number, goalAverage: number) =>
        computeEntryScore(entry(pointsFor, goalAverage), ScoreCalculation.SCORE);

    it('départage au goal average à somme des scores égale', () => {
        expect(score(39, 12)).toBeGreaterThan(score(39, 3));
        expect(score(39, -2)).toBeGreaterThan(score(39, -9));
    });

    it('fait toujours primer la somme des scores sur le goal average', () => {
        expect(score(40, -30)).toBeGreaterThan(score(39, 30));
    });

    it('rend deux équipes ex aequo seulement à somme et goal average égaux', () => {
        expect(score(39, 5)).toBe(score(39, 5));
    });
});
