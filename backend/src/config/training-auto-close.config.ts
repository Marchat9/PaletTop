import { EnvValue, parseBoolean, parseNumber, readEnvGroup } from 'src/config/config.utils';

export interface TrainingAutoCloseConfig {
    enabled: boolean;
    cronExpression: string;
    idleHours: number;
}

export const DEFAULT_TRAINING_AUTO_CLOSE_CONFIG: TrainingAutoCloseConfig = {
    enabled: true,
    cronExpression: '0 10 * * *', // every day at 10h00
    idleHours: 24,
};

export const TRAINING_AUTO_CLOSE_ENV_VARS = [
    'TRAINING_AUTOCLOSE_ENABLED',
    'TRAINING_AUTOCLOSE_CRON_EXPRESSION',
    'TRAINING_AUTOCLOSE_IDLE_HOURS',
] as const;

/**
 * Auto-close for idle training sessions, from env vars: an OPEN TrainingSession whose
 * `lastActivityAt` is older than `idleHours` is switched to CLOSED. Undefined when none of the
 * vars is set. The env vars only initialise the `training_auto_close` app setting.
 */
export function readTrainingAutoCloseConfigFromEnv(
    env: NodeJS.ProcessEnv,
): EnvValue<TrainingAutoCloseConfig> | undefined {
    const defaults = DEFAULT_TRAINING_AUTO_CLOSE_CONFIG;
    return readEnvGroup(env, TRAINING_AUTO_CLOSE_ENV_VARS, (e) => ({
        enabled: parseBoolean(e.TRAINING_AUTOCLOSE_ENABLED, defaults.enabled),
        cronExpression: e.TRAINING_AUTOCLOSE_CRON_EXPRESSION?.trim() || defaults.cronExpression,
        idleHours: parseNumber(e.TRAINING_AUTOCLOSE_IDLE_HOURS, defaults.idleHours),
    }));
}
