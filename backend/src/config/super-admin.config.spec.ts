import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Logger } from '@nestjs/common';
import superAdminConfig from './super-admin.config';

describe('superAdminConfig', () => {
    const originalEnv = { ...process.env };

    beforeEach(() => {
        delete process.env.SUPER_ADMIN_PASSWORD;
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

    it('falls back to the default password outside production, with a warning', () => {
        const warnSpy = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);

        const config = superAdminConfig();

        expect(config.password).toBe('PaletTopPassword');
        expect(warnSpy).toHaveBeenCalled();
    });

    it('uses SUPER_ADMIN_PASSWORD when set, without warning', () => {
        const warnSpy = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
        process.env.SUPER_ADMIN_PASSWORD = 'CustomSecret';

        const config = superAdminConfig();

        expect(config.password).toBe('CustomSecret');
        expect(warnSpy).not.toHaveBeenCalled();
    });

    it('throws at startup when SUPER_ADMIN_PASSWORD is unset in production', () => {
        process.env.NODE_ENV = 'production';

        expect(() => superAdminConfig()).toThrow();
    });

    it('does not throw in production when SUPER_ADMIN_PASSWORD is set', () => {
        process.env.NODE_ENV = 'production';
        process.env.SUPER_ADMIN_PASSWORD = 'CustomSecret';

        expect(() => superAdminConfig()).not.toThrow();
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
