import { Logger } from '@nestjs/common';
import { registerAs } from '@nestjs/config';

export interface SuperAdminConfig {
    password: string;
    maxAttempts: number;
    lockoutBaseDelaySeconds: number;
    lockoutMaxDelaySeconds: number;
    maxPageSize: number;
}

const DEFAULT_PASSWORD = 'PaletTopPassword';
const logger = new Logger('SuperAdminConfig');

function parseNumber(value: string | undefined, defaultValue: number): number {
    if (!value?.trim()) return defaultValue;
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : defaultValue;
}

function resolvePassword(): string {
    const password = process.env.SUPER_ADMIN_PASSWORD;
    if (password) return password;

    if (process.env.NODE_ENV === 'production') {
        throw new Error(
            'SUPER_ADMIN_PASSWORD must be set in production (no default value allowed).',
        );
    }

    logger.warn(
        `SUPER_ADMIN_PASSWORD not set: falling back to the default password "${DEFAULT_PASSWORD}" (dev only, never use this in production).`,
    );
    return DEFAULT_PASSWORD;
}

/**
 * Accès super admin : mot de passe unique (pas de notion d'utilisateur) et
 * seuils de blocage anti-brute-force. Toutes les variables ci-dessous sont
 * optionnelles sauf SUPER_ADMIN_PASSWORD en production.
 */
export default registerAs('superAdmin', (): SuperAdminConfig => ({
    password: resolvePassword(),
    maxAttempts: parseNumber(process.env.SUPER_ADMIN_MAX_ATTEMPTS, 3),
    lockoutBaseDelaySeconds: parseNumber(process.env.SUPER_ADMIN_LOCKOUT_BASE_DELAY_SECONDS, 30),
    lockoutMaxDelaySeconds: parseNumber(process.env.SUPER_ADMIN_LOCKOUT_MAX_DELAY_SECONDS, 1800),
    maxPageSize: parseNumber(process.env.SUPER_ADMIN_MAX_PAGE_SIZE, 100),
}));
