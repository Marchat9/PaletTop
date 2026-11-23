import { describe, expect, it } from 'vitest';
import { computePrincipalBracketSize } from './bracket.utils';

describe('computePrincipalBracketSize', () => {
    it('is the smallest power of two >= N/2', () => {
        expect(computePrincipalBracketSize(14)).toBe(8);
        expect(computePrincipalBracketSize(10)).toBe(8);
        expect(computePrincipalBracketSize(16)).toBe(8);
        expect(computePrincipalBracketSize(62)).toBe(32);
    });
});
