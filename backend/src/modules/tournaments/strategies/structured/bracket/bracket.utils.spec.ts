import { describe, expect, it } from 'vitest';
import { Team } from 'src/entities/team.entity';
import { seededRandom } from '../../../utils/seeded-random.utils';
import {
    BracketSlot,
    buildPyramidalFirstRound,
    buildRandomFirstRound,
    nextRoundSlots,
    seedingOrder,
} from './bracket.utils';

function teams(count: number): Team[] {
    return Array.from(
        { length: count },
        (_, i) => ({ id: `S${i + 1}`, name: `S${i + 1}` }) as Team,
    );
}

/** The matchups of the real matches, as sorted pairs of seed numbers. */
function matchups(slots: BracketSlot[]): string[] {
    return slots
        .filter((slot) => slot.teamB)
        .map((slot) => [slot.teamA.id, slot.teamB!.id].map((id) => Number(id.slice(1))))
        .map((pair) => pair.sort((a, b) => a - b).join('v'))
        .sort();
}

function byeSeeds(slots: BracketSlot[]): number[] {
    return slots
        .filter((slot) => !slot.teamB)
        .map((slot) => Number(slot.teamA.id.slice(1)))
        .sort((a, b) => a - b);
}

describe('seedingOrder', () => {
    const sizes = [2, 4, 8, 16, 32];

    it('is the standard order for 8 slots', () => {
        expect(seedingOrder(8)).toEqual([1, 8, 4, 5, 2, 7, 3, 6]);
    });

    it.each(sizes)('is a permutation of 1..%i', (size) => {
        expect([...seedingOrder(size)].sort((a, b) => a - b)).toEqual(
            Array.from({ length: size }, (_, i) => i + 1),
        );
    });

    it.each(sizes.slice(1))('rebuilds order(%i) from the half-size order by the rule', (size) => {
        const half = seedingOrder(size / 2);
        const rebuilt = half.flatMap((position) => [position, size + 1 - position]);
        expect(seedingOrder(size)).toEqual(rebuilt);
    });

    it.each(sizes)('puts seed 1 and seed 2 in opposite halves (size %i)', (size) => {
        const order = seedingOrder(size);
        const half = size / 2;
        expect(order.indexOf(1)).toBeLessThan(half);
        expect(order.indexOf(2)).toBeGreaterThanOrEqual(half);
    });

    it('refuses a size that is not a power of 2 or is below 2', () => {
        expect(() => seedingOrder(1)).toThrow();
        expect(() => seedingOrder(12)).toThrow();
    });
});

describe('buildPyramidalFirstRound', () => {
    it('8 teams: 4 real matches, no bye', () => {
        const slots = buildPyramidalFirstRound(teams(8));
        expect(slots).toHaveLength(4);
        expect(byeSeeds(slots)).toEqual([]);
        expect(matchups(slots)).toEqual(['1v8', '2v7', '3v6', '4v5']);
    });

    it('12 teams: byes for seeds 1 to 4, real matches 8v9 5v12 6v11 7v10', () => {
        const slots = buildPyramidalFirstRound(teams(12));
        expect(slots).toHaveLength(8);
        expect(byeSeeds(slots)).toEqual([1, 2, 3, 4]);
        expect(matchups(slots)).toEqual(['5v12', '6v11', '7v10', '8v9']);
    });

    it('keeps seed 1 and seed 2 in opposite halves of the positions', () => {
        const slots = buildPyramidalFirstRound(teams(12));
        const positionOf = (seed: string) =>
            slots.find((slot) => slot.teamA.id === seed || slot.teamB?.id === seed)!.position;
        expect(positionOf('S1')).toBeLessThan(4);
        expect(positionOf('S2')).toBeGreaterThanOrEqual(4);
    });

    it('5 teams: 3 byes for seeds 1 to 3 and one match 4v5', () => {
        const slots = buildPyramidalFirstRound(teams(5));
        expect(slots).toHaveLength(4);
        expect(byeSeeds(slots)).toEqual([1, 2, 3]);
        expect(matchups(slots)).toEqual(['4v5']);
    });

    it('2 teams: one slot', () => {
        const slots = buildPyramidalFirstRound(teams(2));
        expect(slots).toHaveLength(1);
        expect(matchups(slots)).toEqual(['1v2']);
    });

    it('gives every slot a distinct position from 0', () => {
        const positions = buildPyramidalFirstRound(teams(12)).map((slot) => slot.position);
        expect([...positions].sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
    });

    it('refuses fewer than two teams', () => {
        expect(() => buildPyramidalFirstRound(teams(1))).toThrow();
        expect(() => buildPyramidalFirstRound([])).toThrow();
    });
});

describe('buildRandomFirstRound', () => {
    const pairsInOrder = (list: Team[]): [Team, Team][] =>
        Array.from({ length: list.length / 2 }, (_, i) => [list[2 * i], list[2 * i + 1]]);

    it('12 teams: 4 byes, 4 matches, 8 distinct positions', () => {
        const slots = buildRandomFirstRound(
            teams(12),
            seededRandom('t1:bracket:3:0:main'),
            pairsInOrder,
        );
        expect(slots).toHaveLength(8);
        expect(byeSeeds(slots)).toHaveLength(4);
        expect(matchups(slots)).toHaveLength(4);
        expect(slots.map((slot) => slot.position).sort((a, b) => a - b)).toEqual([
            0, 1, 2, 3, 4, 5, 6, 7,
        ]);
    });

    it('uses every team exactly once', () => {
        const slots = buildRandomFirstRound(
            teams(12),
            seededRandom('t1:bracket:3:0:main'),
            pairsInOrder,
        );
        const used = slots.flatMap((slot) => [slot.teamA.id, slot.teamB?.id]).filter(Boolean);
        expect(new Set(used).size).toBe(12);
        expect(used).toHaveLength(12);
    });

    it('gives the same slots for the same seed, whatever the order of the teams', () => {
        const run = (input: Team[]) =>
            buildRandomFirstRound(input, seededRandom('t1:bracket:3:0:main'), pairsInOrder).map(
                (slot) => `${slot.position}:${slot.teamA.id}-${slot.teamB?.id ?? 'bye'}`,
            );
        expect(run(teams(12))).toEqual(run([...teams(12)].reverse()));
    });

    it('changes the tree from one seed to another', () => {
        const trees = new Set(
            [1, 2, 3, 4, 5].map((session) =>
                buildRandomFirstRound(
                    teams(12),
                    seededRandom(`t1:bracket:${session}:0`),
                    pairsInOrder,
                )
                    .map((slot) => `${slot.teamA.id}-${slot.teamB?.id ?? 'bye'}`)
                    .join(),
            ),
        );
        expect(trees.size).toBeGreaterThan(1);
    });

    it('asks the draw to pair only the teams without bye', () => {
        const seen: string[][] = [];
        const slots = buildRandomFirstRound(teams(12), seededRandom('x'), (list) => {
            seen.push(list.map((team) => team.id));
            return pairsInOrder(list);
        });
        expect(seen).toHaveLength(1);
        expect(seen[0]).toHaveLength(8);
        const byeIds = slots.filter((slot) => !slot.teamB).map((slot) => slot.teamA.id);
        expect(seen[0].filter((id) => byeIds.includes(id))).toEqual([]);
    });

    it('has no bye when the team count is a power of 2', () => {
        const slots = buildRandomFirstRound(teams(8), seededRandom('x'), pairsInOrder);
        expect(slots).toHaveLength(4);
        expect(byeSeeds(slots)).toEqual([]);
    });

    it('refuses fewer than two teams', () => {
        expect(() => buildRandomFirstRound(teams(1), seededRandom('x'), pairsInOrder)).toThrow();
    });
});

describe('nextRoundSlots', () => {
    const result = (position: number, winner: string | null) => ({
        position,
        winner: winner ? ({ id: winner, name: winner } as Team) : null,
    });

    it('gives match k the winners of positions 2k and 2k+1', () => {
        const slots = nextRoundSlots([
            result(0, 'A'),
            result(1, 'B'),
            result(2, 'C'),
            result(3, 'D'),
        ]);
        expect(slots.map((slot) => [slot.position, slot.teamA.id, slot.teamB?.id])).toEqual([
            [0, 'A', 'B'],
            [1, 'C', 'D'],
        ]);
    });

    it('does not depend on the order the results are given in', () => {
        const slots = nextRoundSlots([
            result(3, 'D'),
            result(0, 'A'),
            result(2, 'C'),
            result(1, 'B'),
        ]);
        expect(slots.map((slot) => [slot.teamA.id, slot.teamB?.id])).toEqual([
            ['A', 'B'],
            ['C', 'D'],
        ]);
    });

    it('refuses an unfinished match or an odd number of matches', () => {
        expect(() => nextRoundSlots([result(0, 'A'), result(1, null)])).toThrow();
        expect(() => nextRoundSlots([result(0, 'A'), result(1, 'B'), result(2, 'C')])).toThrow();
    });
});
