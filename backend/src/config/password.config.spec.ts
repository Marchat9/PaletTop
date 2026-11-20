import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Logger } from '@nestjs/common';
import passwordConfig, { DEV_PASSWORD_PEPPER, resolvePasswordPepper } from './password.config';

describe('passwordConfig', () => {
    const originalEnv = { ...process.env };

    beforeEach(() => {
        delete process.env.PASSWORD_PEPPER;
        delete process.env.NODE_ENV;
    });

    afterEach(() => {
        process.env = { ...originalEnv };
        vi.restoreAllMocks();
    });

    it('uses PASSWORD_PEPPER when set, without warning', () => {
        const warnSpy = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
        process.env.PASSWORD_PEPPER = 'a'.repeat(44);

        expect(passwordConfig().pepper).toBe('a'.repeat(44));
        expect(warnSpy).not.toHaveBeenCalled();
    });

    it('falls back to the dev pepper outside production, with a warning', () => {
        const warnSpy = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);

        expect(resolvePasswordPepper()).toBe('dev-only-password-pepper-change-me');
        expect(DEV_PASSWORD_PEPPER).toBe('dev-only-password-pepper-change-me');
        expect(warnSpy).toHaveBeenCalled();
    });

    it('treats an empty PASSWORD_PEPPER as unset', () => {
        vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
        process.env.PASSWORD_PEPPER = '';

        expect(resolvePasswordPepper()).toBe(DEV_PASSWORD_PEPPER);
    });

    it('throws in production when PASSWORD_PEPPER is unset', () => {
        process.env.NODE_ENV = 'production';

        expect(() => resolvePasswordPepper()).toThrow('PASSWORD_PEPPER must be set in production');
    });

    it('throws when PASSWORD_PEPPER is shorter than 32 characters', () => {
        process.env.NODE_ENV = 'production';
        process.env.PASSWORD_PEPPER = 'a'.repeat(31);

        expect(() => resolvePasswordPepper()).toThrow(
            'PASSWORD_PEPPER must be at least 32 characters',
        );
    });

    it('accepts a 32-character pepper in production', () => {
        process.env.NODE_ENV = 'production';
        process.env.PASSWORD_PEPPER = 'a'.repeat(32);

        expect(resolvePasswordPepper()).toBe('a'.repeat(32));
    });
});
