import { ConflictException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { generateNumericCode } from './numeric-code.util';

describe('generateNumericCode', () => {
    it('returns a code of the requested length, outside the existing ones', () => {
        const code = generateNumericCode(['0000', '0001'], 4);
        expect(code).toMatch(/^\d{4}$/);
        expect(['0000', '0001']).not.toContain(code);
    });

    it('still finds the last free code when the space is nearly full', () => {
        const existing = Array.from({ length: 99 }, (_, i) => i.toString().padStart(2, '0'));
        const free = existing.splice(42, 1)[0];
        expect(generateNumericCode(existing, 2)).toBe(free);
    });

    it('throws instead of looping forever once every code is taken', () => {
        const existing = Array.from({ length: 100 }, (_, i) => i.toString().padStart(2, '0'));
        expect(() => generateNumericCode(existing, 2)).toThrow(ConflictException);
    });
});
