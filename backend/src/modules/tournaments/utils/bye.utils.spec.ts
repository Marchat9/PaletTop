import { describe, expect, it } from 'vitest';
import { Team } from 'src/entities/team.entity';
import { selectByeTeam } from './bye.utils';
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
