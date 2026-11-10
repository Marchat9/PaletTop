import { registerAs } from '@nestjs/config';

export interface TrainingCleanupConfig {
    enabled: boolean;
    cronExpression: string;
    /** A session is only deleted once closed for at least this many days. */
    retentionDays: number;
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
 * Cleanup of empty training sessions: a CLOSED TrainingSession without any participant or without
 * any round, closed for at least `retentionDays`, is permanently deleted. Open sessions, and closed
 * ones that were really played, are never touched.
 */
export default registerAs('trainingCleanup', (): TrainingCleanupConfig => ({
    enabled: parseBoolean(process.env.TRAINING_CLEANUP_ENABLED, true),
    cronExpression: process.env.TRAINING_CLEANUP_CRON_EXPRESSION ?? '0 6 * * 1', // every Monday at 6h00
    retentionDays: parseNumber(process.env.TRAINING_CLEANUP_RETENTION_DAYS, 7),
}));
