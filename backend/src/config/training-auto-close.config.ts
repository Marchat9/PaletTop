import { registerAs } from '@nestjs/config';

export interface TrainingAutoCloseConfig {
    enabled: boolean;
    cronExpression: string;
    idleHours: number;
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
 * Auto-close for idle training sessions: an OPEN TrainingSession whose `lastActivityAt` is older
 * than `idleHours` is switched to CLOSED.
 */
export default registerAs('trainingAutoClose', (): TrainingAutoCloseConfig => ({
    enabled: parseBoolean(process.env.TRAINING_AUTOCLOSE_ENABLED, true),
    cronExpression: process.env.TRAINING_AUTOCLOSE_CRON_EXPRESSION ?? '0 10 * * *', // every day at 10h00
    idleHours: parseNumber(process.env.TRAINING_AUTOCLOSE_IDLE_HOURS, 24),
}));
