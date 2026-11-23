import { Logger } from '@nestjs/common';
import { registerAs } from '@nestjs/config';
import { parseNumber } from 'src/config/config.utils';
import { isArgon2idHash } from 'src/utils/password-hash.util';

export interface SuperAdminConfig {
    passwordHash: string;
    maxAttempts: number;
    lockoutBaseDelaySeconds: number;
    lockoutMaxDelaySeconds: number;
    maxPageSize: number;
}

/** Argon2id hash of "PaletTopPassword": dev-only default, never accepted in production. */
export const DEV_SUPER_ADMIN_PASSWORD_HASH =
    '$argon2id$v=19$m=19456,t=2,p=1$MEb7/t5bTYYdVb13JPJkZw$E/SY7SL58fN+tZ7HNhdjxyRovuppg6kJwcP4HBZx6E0';
const logger = new Logger('SuperAdminConfig');

function resolvePasswordHash(): string {
    const passwordHash = process.env.SUPER_ADMIN_PASSWORD_HASH;

    if (!passwordHash) {
        if (process.env.NODE_ENV === 'production') {
            throw new Error(
                'SUPER_ADMIN_PASSWORD_HASH must be set in production (no default value allowed).',
            );
        }
        logger.warn(
            'SUPER_ADMIN_PASSWORD_HASH not set: falling back to the hash of the default password "PaletTopPassword" (dev only, never use this in production).',
        );
        return DEV_SUPER_ADMIN_PASSWORD_HASH;
    }

    // Fails fast on a clear password or a hash mangled on the way (e.g. its `$` interpolated by
    // docker compose), instead of silently rejecting every login.
    if (!isArgon2idHash(passwordHash)) {
        throw new Error(
            'SUPER_ADMIN_PASSWORD_HASH is not a valid argon2id hash (generate one with `npm run hash-password`; wrap it in single quotes in a .env file).',
        );
    }
    return passwordHash;
}

/**
 * Accès super admin : mot de passe unique (pas de notion d'utilisateur), fourni sous forme de hash
 * Argon2id, et seuils de blocage anti-brute-force. Toutes les variables ci-dessous sont
 * optionnelles sauf SUPER_ADMIN_PASSWORD_HASH en production.
 */
export default registerAs('superAdmin', (): SuperAdminConfig => ({
    passwordHash: resolvePasswordHash(),
    maxAttempts: parseNumber(process.env.SUPER_ADMIN_MAX_ATTEMPTS, 3, true),
    lockoutBaseDelaySeconds: parseNumber(
        process.env.SUPER_ADMIN_LOCKOUT_BASE_DELAY_SECONDS,
        30,
        true,
    ),
    lockoutMaxDelaySeconds: parseNumber(
        process.env.SUPER_ADMIN_LOCKOUT_MAX_DELAY_SECONDS,
        1800,
        true,
    ),
    maxPageSize: parseNumber(process.env.SUPER_ADMIN_MAX_PAGE_SIZE, 100, true),
}));
