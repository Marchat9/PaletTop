import { describe, expect, it } from 'vitest';
import { buildSeed, seededRandom } from './seeded-random.utils';

describe('seededRandom', () => {
    const take = (seed: string, count: number): number[] => {
        const random = seededRandom(seed);
        return Array.from({ length: count }, () => random());
    };

    it('gives the same values for the same seed', () => {
        expect(take('t1:draw:2:0', 5)).toEqual(take('t1:draw:2:0', 5));
    });

    it('gives different values for different seeds', () => {
        expect(take('t1:draw:2:0', 5)).not.toEqual(take('t1:draw:3:0', 5));
    });

    it('stays in [0, 1)', () => {
        for (const value of take('t1:bye:1:0', 1000)) {
            expect(value).toBeGreaterThanOrEqual(0);
            expect(value).toBeLessThan(1);
        }
    });
});

describe('buildSeed', () => {
    it('joins the tournament, the usage, the session and the attempt', () => {
        expect(buildSeed('t1', 'draw', 2)).toBe('t1:draw:2:0');
    });

    it('appends the group key when given', () => {
        expect(buildSeed('t1', 'bye', 2, 'main')).toBe('t1:bye:2:0:main');
    });
});
