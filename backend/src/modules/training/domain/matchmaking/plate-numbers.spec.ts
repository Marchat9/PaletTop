import { describe, expect, it } from 'vitest';
import { plateNumbers } from './plate-numbers';

describe('plateNumbers', () => {
    it('numérote les matchs à partir de 1, sans plaque pour un exempt', () => {
        expect(
            plateNumbers([{ isBye: false }, { isBye: true }, { isBye: false }, { isBye: false }]),
        ).toEqual([1, null, 2, 3]);
    });

    it('ne numérote rien sans match', () => {
        expect(plateNumbers([])).toEqual([]);
    });
});
