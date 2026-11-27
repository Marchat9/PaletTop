import { describe, expect, it } from 'vitest';
import { fixedDraw } from './fixed-draw.utils';

describe('fixedDraw', () => {
    it('matches the FNV-1a 32-bit reference vectors', () => {
        expect(fixedDraw('')).toBe(2166136261);
        expect(fixedDraw('a')).toBe(3826002220);
        expect(fixedDraw('foobar')).toBe(3214735720);
    });

    it('is deterministic', () => {
        expect(fixedDraw('t1:e1')).toBe(fixedDraw('t1:e1'));
    });

    it('gives different values for different keys', () => {
        expect(fixedDraw('t1:e1')).not.toBe(fixedDraw('t1:e2'));
    });

    it('returns an unsigned 32-bit integer', () => {
        const value = fixedDraw('7c1f0a52-0000-4000-8000-000000000001:team-id');
        expect(Number.isInteger(value)).toBe(true);
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThan(2 ** 32);
    });
});
