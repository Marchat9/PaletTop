import { describe, expect, it } from 'vitest';
import { Team } from 'src/entities/team.entity';
import { computeByeScore, selectByeTeam } from './bye.utils';
import { buildSeed, seededRandom } from './seeded-random.utils';

const teams = ['A', 'B', 'C', 'D', 'E', 'F'].map((id) => ({ id, name: id }) as Team);

describe('selectByeTeam with a seed', () => {
    const pick = (seed: string): string =>
        selectByeTeam(teams, [], undefined, seededRandom(seed)).id;

    it('gives the same team for the same seed', () => {
        expect(pick(buildSeed('t1', 'bye', 1))).toBe(pick(buildSeed('t1', 'bye', 1)));
    });

    it('does not always give the same team across seeds', () => {
        const picks = new Set(
            [1, 2, 3, 4, 5, 6, 7, 8].map((session) => pick(buildSeed('t1', 'bye', session))),
        );
        expect(picks.size).toBeGreaterThan(1);
    });
});

describe('computeByeScore', () => {
    it.each([
        [13, 6, 13, 6],
        [11, 6, 11, 6],
        [13, 3, 13, 3],
        [1, 6, 1, 0],
    ])('scores %i points with a cap of %i as %i-%i', (pointsPerGame, cap, own, against) => {
        expect(computeByeScore(pointsPerGame, cap)).toEqual({ own, against });
    });
});
