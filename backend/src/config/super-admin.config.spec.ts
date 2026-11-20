import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Logger } from '@nestjs/common';
import { verifyPassword } from 'src/utils/password-hash.util';
import superAdminConfig, { DEV_SUPER_ADMIN_PASSWORD_HASH } from './super-admin.config';

// Hash of 'CustomSecret' (argon2id, OWASP parameters).
const CUSTOM_HASH =
    '$argon2id$v=19$m=19456,t=2,p=1$pGtwdURTNUuVMBrbYjLnpA$X2AaA6bTrUy/tZBv7mzq5hdUxVaHiCe9/3sJAv7SmkE';

describe('superAdminConfig', () => {
    const originalEnv = { ...process.env };

    beforeEach(() => {
        delete process.env.SUPER_ADMIN_PASSWORD;
        delete process.env.SUPER_ADMIN_PASSWORD_HASH;
        delete process.env.SUPER_ADMIN_MAX_ATTEMPTS;
        delete process.env.SUPER_ADMIN_LOCKOUT_BASE_DELAY_SECONDS;
        delete process.env.SUPER_ADMIN_LOCKOUT_MAX_DELAY_SECONDS;
        delete process.env.SUPER_ADMIN_MAX_PAGE_SIZE;
        delete process.env.NODE_ENV;
    });

    afterEach(() => {
        process.env = { ...originalEnv };
        vi.restoreAllMocks();
    });

    it('falls back to the hash of PaletTopPassword outside production, with a warning', async () => {
        const warnSpy = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);

        const config = superAdminConfig();

        expect(config.passwordHash).toBe(DEV_SUPER_ADMIN_PASSWORD_HASH);
        await expect(verifyPassword(config.passwordHash, 'PaletTopPassword')).resolves.toBe(true);
        expect(String(warnSpy.mock.calls[0][0])).toContain('PaletTopPassword');
    });

    it('uses SUPER_ADMIN_PASSWORD_HASH when set, without warning', () => {
        const warnSpy = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
        process.env.SUPER_ADMIN_PASSWORD_HASH = CUSTOM_HASH;

        const config = superAdminConfig();

        expect(config.passwordHash).toBe(CUSTOM_HASH);
        expect(warnSpy).not.toHaveBeenCalled();
    });

    it('ignores the removed SUPER_ADMIN_PASSWORD variable', () => {
        vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
        process.env.SUPER_ADMIN_PASSWORD = 'CustomSecret';

        expect(superAdminConfig().passwordHash).toBe(DEV_SUPER_ADMIN_PASSWORD_HASH);
    });

    it('throws at startup when SUPER_ADMIN_PASSWORD_HASH is unset in production', () => {
        process.env.NODE_ENV = 'production';

        expect(() => superAdminConfig()).toThrow(
            'SUPER_ADMIN_PASSWORD_HASH must be set in production (no default value allowed).',
        );
    });

    it('does not throw in production when SUPER_ADMIN_PASSWORD_HASH is set', () => {
        process.env.NODE_ENV = 'production';
        process.env.SUPER_ADMIN_PASSWORD_HASH = CUSTOM_HASH;

        expect(() => superAdminConfig()).not.toThrow();
    });

    it('throws when SUPER_ADMIN_PASSWORD_HASH is not an argon2id hash, in every environment', () => {
        // A clear password, and what compose leaves of a hash whose $ were interpolated.
        for (const value of ['PaletTopPassword', '=19=19456,t=2,p=1']) {
            for (const env of ['production', 'development']) {
                process.env.NODE_ENV = env;
                process.env.SUPER_ADMIN_PASSWORD_HASH = value;

                expect(() => superAdminConfig()).toThrow(
                    'SUPER_ADMIN_PASSWORD_HASH is not a valid argon2id hash',
                );
            }
        }
    });

    it('uses default thresholds when override env vars are unset', () => {
        const config = superAdminConfig();

        expect(config.maxAttempts).toBe(3);
        expect(config.lockoutBaseDelaySeconds).toBe(30);
        expect(config.lockoutMaxDelaySeconds).toBe(1800);
    });

    it('respects overridden thresholds from env vars', () => {
        process.env.SUPER_ADMIN_MAX_ATTEMPTS = '5';
        process.env.SUPER_ADMIN_LOCKOUT_BASE_DELAY_SECONDS = '10';
        process.env.SUPER_ADMIN_LOCKOUT_MAX_DELAY_SECONDS = '600';

        const config = superAdminConfig();

        expect(config.maxAttempts).toBe(5);
        expect(config.lockoutBaseDelaySeconds).toBe(10);
        expect(config.lockoutMaxDelaySeconds).toBe(600);
    });

    it('falls back to defaults when an override env var is not a valid number', () => {
        process.env.SUPER_ADMIN_MAX_ATTEMPTS = 'not-a-number';

        const config = superAdminConfig();

        expect(config.maxAttempts).toBe(3);
    });

    it('falls back to defaults when an override env var is blank', () => {
        process.env.SUPER_ADMIN_LOCKOUT_BASE_DELAY_SECONDS = '';

        const config = superAdminConfig();

        expect(config.lockoutBaseDelaySeconds).toBe(30);
    });

    it('defaults maxPageSize to 100', () => {
        const config = superAdminConfig();

        expect(config.maxPageSize).toBe(100);
    });

    it('respects SUPER_ADMIN_MAX_PAGE_SIZE', () => {
        process.env.SUPER_ADMIN_MAX_PAGE_SIZE = '250';

        const config = superAdminConfig();

        expect(config.maxPageSize).toBe(250);
    });
});
