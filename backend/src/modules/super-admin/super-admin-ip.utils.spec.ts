import { describe, expect, it } from 'vitest';
import { resolveClientIp } from './super-admin-ip.utils';

describe('resolveClientIp', () => {
    it('uses CF-Connecting-IP when present', () => {
        expect(resolveClientIp('1.2.3.4', '10.0.0.1')).toBe('1.2.3.4');
    });

    it('falls back to fallbackIp when CF-Connecting-IP is absent', () => {
        expect(resolveClientIp(undefined, '10.0.0.1')).toBe('10.0.0.1');
    });

    it('falls back to fallbackIp when CF-Connecting-IP is blank', () => {
        expect(resolveClientIp('   ', '10.0.0.1')).toBe('10.0.0.1');
    });

    it('treats a duplicated header (array value) as untrusted and falls back', () => {
        expect(resolveClientIp(['1.2.3.4', '5.6.7.8'], '10.0.0.1')).toBe('10.0.0.1');
    });

    it("returns 'unknown' when both CF-Connecting-IP and fallbackIp are absent", () => {
        expect(resolveClientIp(undefined, undefined)).toBe('unknown');
    });

    it('trims surrounding whitespace from CF-Connecting-IP', () => {
        expect(resolveClientIp('  1.2.3.4  ', '10.0.0.1')).toBe('1.2.3.4');
    });
});
