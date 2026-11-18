import { EnvValue, parseBoolean, parseNumber, readEnvGroup } from 'src/config/config.utils';

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

export const DEFAULT_CLEANUP_CONFIG: CleanupConfig = {
    enabled: true,
    cronExpression: '0 3 * * *', // every day at 3am
    completed: { enabled: true, retentionDays: 7 },
    draft: { enabled: true, retentionDays: 7, maxFutureDays: 365 },
    active: { enabled: true, retentionDays: 7 },
};

export const CLEANUP_ENV_VARS = [
    'CLEANUP_ENABLED',
    'CLEANUP_CRON_EXPRESSION',
    'CLEANUP_COMPLETED_ENABLED',
    'CLEANUP_COMPLETED_RETENTION_DAYS',
    'CLEANUP_DRAFT_ENABLED',
    'CLEANUP_DRAFT_RETENTION_DAYS',
    'CLEANUP_DRAFT_MAX_FUTURE_DAYS',
    'CLEANUP_ACTIVE_ENABLED',
    'CLEANUP_ACTIVE_RETENTION_DAYS',
] as const;

/**
 * Tournament cleanup from env vars: each rule can be disabled on its own (CLEANUP_*_ENABLED) or
 * all at once (CLEANUP_ENABLED). Undefined when none of the vars is set. The env vars only
 * initialise the `tournament_cleanup` app setting, which the super-admin can then edit.
 */
export function readCleanupConfigFromEnv(
    env: NodeJS.ProcessEnv,
): EnvValue<CleanupConfig> | undefined {
    const defaults = DEFAULT_CLEANUP_CONFIG;
    return readEnvGroup(env, CLEANUP_ENV_VARS, (e) => ({
        enabled: parseBoolean(e.CLEANUP_ENABLED, defaults.enabled),
        cronExpression: e.CLEANUP_CRON_EXPRESSION?.trim() || defaults.cronExpression,
        completed: {
            enabled: parseBoolean(e.CLEANUP_COMPLETED_ENABLED, defaults.completed.enabled),
            retentionDays: parseNumber(
                e.CLEANUP_COMPLETED_RETENTION_DAYS,
                defaults.completed.retentionDays,
            ),
        },
        draft: {
            enabled: parseBoolean(e.CLEANUP_DRAFT_ENABLED, defaults.draft.enabled),
            retentionDays: parseNumber(
                e.CLEANUP_DRAFT_RETENTION_DAYS,
                defaults.draft.retentionDays,
            ),
            maxFutureDays: parseNumber(
                e.CLEANUP_DRAFT_MAX_FUTURE_DAYS,
                defaults.draft.maxFutureDays,
            ),
        },
        active: {
            enabled: parseBoolean(e.CLEANUP_ACTIVE_ENABLED, defaults.active.enabled),
            retentionDays: parseNumber(
                e.CLEANUP_ACTIVE_RETENTION_DAYS,
                defaults.active.retentionDays,
            ),
        },
    }));
}
