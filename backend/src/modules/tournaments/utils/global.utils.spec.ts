import { afterEach, describe, expect, it, vi } from 'vitest';
import { shuffleFisherYates } from './global.utils';

describe('shuffleFisherYates', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('returns an empty array when given an empty array', () => {
        expect(shuffleFisherYates([])).toEqual([]);
    });

    it('returns the same single element when given a 1-element array', () => {
        expect(shuffleFisherYates(['only'])).toEqual(['only']);
    });

    it('does not mutate the input array', () => {
        const input = [1, 2, 3, 4, 5];
        const snapshot = [...input];

        const result = shuffleFisherYates(input);

        expect(input).toEqual(snapshot);
        expect(result).not.toBe(input);
    });

    it('preserves every element (same multiset, only reordered)', () => {
        const input = Array.from({ length: 30 }, (_, i) => i);

        const result = shuffleFisherYates(input);

        expect(result).toHaveLength(input.length);
        expect([...result].sort((a, b) => a - b)).toEqual(input);
    });

    it('produces the expected permutation when Math.random always returns 0 (deterministic lower bound)', () => {
        vi.spyOn(Math, 'random').mockReturnValue(0);

        // Each step swaps position i with position 0 (j = floor(0 * (i+1)) = 0).
        expect(shuffleFisherYates([1, 2, 3, 4])).toEqual([2, 3, 4, 1]);
    });

    it('leaves the array unchanged when Math.random always returns a value that rounds up to i (upper bound, j clamped)', () => {
        // With random just under 1, floor(random * (i + 1)) === i, so every swap is a no-op.
        vi.spyOn(Math, 'random').mockReturnValue(0.999999999);

        expect(shuffleFisherYates([1, 2, 3, 4])).toEqual([1, 2, 3, 4]);
    });

    it('never produces an out-of-bounds swap when Math.random returns exactly 1 (edge case guarded by Math.min)', () => {
        // Math.random() can theoretically return 1 due to floating point rounding upstream;
        // without the Math.min(..., i) clamp, j would be i + 1, which is out of bounds.
        vi.spyOn(Math, 'random').mockReturnValue(1);

        const result = shuffleFisherYates([1, 2, 3, 4]);

        expect(result).toHaveLength(4);
        expect(result).not.toContain(undefined);
        expect([...result].sort((a, b) => a - b)).toEqual([1, 2, 3, 4]);
    });
});
