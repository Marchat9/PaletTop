import { Logger } from '@nestjs/common';
import { registerAs } from '@nestjs/config';

export interface PasswordConfig {
    pepper: string;
}

export const DEV_PASSWORD_PEPPER = 'dev-only-password-pepper-change-me';
const MIN_PEPPER_LENGTH = 32;
const logger = new Logger('PasswordConfig');

/**
 * Pepper mixed into the tournament/training admin password hashes. It must never change once
 * passwords have been hashed with it (they would all become invalid) and must be backed up
 * outside the server. Also read by the migration that hashes the existing passwords.
 */
export function resolvePasswordPepper(): string {
    const pepper = process.env.PASSWORD_PEPPER;

    if (!pepper) {
        if (process.env.NODE_ENV === 'production') {
            throw new Error('PASSWORD_PEPPER must be set in production (no default value allowed).');
        }
        logger.warn(
            'PASSWORD_PEPPER not set: falling back to the dev pepper (dev only, never use this in production).',
        );
        return DEV_PASSWORD_PEPPER;
    }

    if (pepper.length < MIN_PEPPER_LENGTH) {
        throw new Error(
            `PASSWORD_PEPPER must be at least ${MIN_PEPPER_LENGTH} characters (e.g. openssl rand -base64 32).`,
        );
    }
    return pepper;
}

export default registerAs('password', (): PasswordConfig => ({ pepper: resolvePasswordPepper() }));
