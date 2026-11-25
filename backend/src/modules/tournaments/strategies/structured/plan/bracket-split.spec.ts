import { describe, expect, it } from 'vitest';
import { layoutTeams, splitTeams } from './bracket-split';
import { BracketSize } from './plan.types';

function sizes(...entries: Array<[number, number]>): BracketSize[] {
    return entries.map(([capacity, count]) => ({ capacity, count }));
}

describe('splitTeams', () => {
    const cases: Array<[number, number, BracketSize[] | null]> = [
        [64, 2, sizes([32, 32], [32, 32])],
        [96, 3, sizes([32, 32], [32, 32], [32, 32])],
        [128, 3, sizes([64, 64], [32, 32], [32, 32])],
        [160, 3, sizes([64, 64], [64, 64], [32, 32])],
        [192, 4, sizes([64, 64], [64, 64], [32, 32], [32, 32])],
        [224, 3, sizes([128, 128], [64, 64], [32, 32])],
        [120, 3, sizes([64, 64], [32, 32], [32, 24])],
        [150, 3, sizes([64, 64], [64, 64], [32, 22])],
        [100, 3, sizes([64, 64], [32, 32], [4, 4])],
        [70, 2, sizes([64, 64], [8, 6])],
        [97, 3, null],
        [256, 1, sizes([256, 256])],
        [256, 2, sizes([128, 128], [128, 128])],
        [256, 3, sizes([128, 128], [64, 64], [64, 64])],
        [256, 4, sizes([64, 64], [64, 64], [64, 64], [64, 64])],
        [256, 5, sizes([64, 64], [64, 64], [64, 64], [32, 32], [32, 32])],
    ];

    it.each(cases)('splits %i teams into %i brackets', (teamCount, bracketCount, expected) => {
        expect(splitTeams(teamCount, bracketCount)).toEqual(expected);
    });
});

describe('layoutTeams', () => {
    it('adds an extra bracket for the surplus teams', () => {
        const layout = layoutTeams(136, 128, 3, 4);
        expect(layout.brackets).toEqual([
            { capacity: 64, count: 64 },
            { capacity: 32, count: 32 },
            { capacity: 32, count: 32 },
            { capacity: 8, count: 8, extra: true },
        ]);
        expect(layout.capacitySum).toBe(128);
    });

    it('sizes the extra bracket from the surplus', () => {
        const big = layoutTeams(150, 128, 3, 4).brackets;
        expect(big?.[3]).toEqual({ capacity: 32, count: 22, extra: true });
        const small = layoutTeams(130, 128, 3, 4).brackets;
        expect(small?.[3]).toEqual({ capacity: 2, count: 2, extra: true });
    });

    it('re-splits without extra bracket when the teams fit the target capacity', () => {
        const layout = layoutTeams(125, 128, 3, 4);
        expect(layout.brackets).toEqual(sizes([64, 64], [32, 32], [32, 29]));
        expect(layout.noRoomForExtra).toBeUndefined();
    });

    it('falls back to a plain split when the maximum of brackets is reached', () => {
        const layout = layoutTeams(136, 128, 3, 3);
        expect(layout.brackets).toEqual(splitTeams(136, 3));
        expect(layout.noRoomForExtra).toBe(true);
    });

    it('returns no brackets when the target cannot be split', () => {
        expect(layoutTeams(100, 97, 3, 4).brackets).toBeNull();
    });
});
