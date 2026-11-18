import { EnvValue, parseBoolean, parseNumber, readEnvGroup } from 'src/config/config.utils';

export interface TrainingCleanupConfig {
    enabled: boolean;
    cronExpression: string;
    /** A session is only deleted once closed for at least this many days. */
    retentionDays: number;
}

export const DEFAULT_TRAINING_CLEANUP_CONFIG: TrainingCleanupConfig = {
    enabled: true,
    cronExpression: '0 6 * * 1', // every Monday at 6h00
    retentionDays: 7,
};

export const TRAINING_CLEANUP_ENV_VARS = [
    'TRAINING_CLEANUP_ENABLED',
    'TRAINING_CLEANUP_CRON_EXPRESSION',
    'TRAINING_CLEANUP_RETENTION_DAYS',
] as const;

/**
 * Cleanup of empty training sessions, from env vars: a CLOSED TrainingSession without any
 * participant or without any round, closed for at least `retentionDays`, is permanently deleted.
 * Undefined when none of the vars is set. The env vars only initialise the `training_cleanup`
 * app setting, which the super-admin can then edit.
 */
export function readTrainingCleanupConfigFromEnv(
    env: NodeJS.ProcessEnv,
): EnvValue<TrainingCleanupConfig> | undefined {
    const defaults = DEFAULT_TRAINING_CLEANUP_CONFIG;
    return readEnvGroup(env, TRAINING_CLEANUP_ENV_VARS, (e) => ({
        enabled: parseBoolean(e.TRAINING_CLEANUP_ENABLED, defaults.enabled),
        cronExpression: e.TRAINING_CLEANUP_CRON_EXPRESSION?.trim() || defaults.cronExpression,
        retentionDays: parseNumber(e.TRAINING_CLEANUP_RETENTION_DAYS, defaults.retentionDays),
    }));
}
