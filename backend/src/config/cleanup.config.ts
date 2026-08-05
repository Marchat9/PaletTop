import { registerAs } from '@nestjs/config';

export interface CleanupRuleConfig {
    enabled: boolean;
    retentionDays: number;
}

export interface CleanupDraftRuleConfig extends CleanupRuleConfig {
    maxFutureDays: number;
}

export interface CleanupConfig {
    enabled: boolean;
    cronExpression: string;
    completed: CleanupRuleConfig;
    draft: CleanupDraftRuleConfig;
    active: CleanupRuleConfig;
}

function parseBoolean(value: string | undefined, defaultValue: boolean): boolean {
    if (value === undefined) return defaultValue;
    return value.toLowerCase() === 'true';
}

function parseNumber(value: string | undefined, defaultValue: number): number {
    if (value === undefined) return defaultValue;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : defaultValue;
}

/**
 * Nettoyage automatique des tournois : chaque règle peut être désactivée
 * indépendamment (CLEANUP_*_ENABLED) ou globalement (CLEANUP_ENABLED).
 */
export default registerAs('cleanup', (): CleanupConfig => ({
    enabled: parseBoolean(process.env.CLEANUP_ENABLED, true),
    cronExpression: process.env.CLEANUP_CRON_EXPRESSION ?? '0 3 * * *', // every day at 3am
    completed: {
        enabled: parseBoolean(process.env.CLEANUP_COMPLETED_ENABLED, true),
        retentionDays: parseNumber(process.env.CLEANUP_COMPLETED_RETENTION_DAYS, 7),
    },
    draft: {
        enabled: parseBoolean(process.env.CLEANUP_DRAFT_ENABLED, true),
        retentionDays: parseNumber(process.env.CLEANUP_DRAFT_RETENTION_DAYS, 7),
        maxFutureDays: parseNumber(process.env.CLEANUP_DRAFT_MAX_FUTURE_DAYS, 365),
    },
    active: {
        enabled: parseBoolean(process.env.CLEANUP_ACTIVE_ENABLED, true),
        retentionDays: parseNumber(process.env.CLEANUP_ACTIVE_RETENTION_DAYS, 7),
    },
}));
