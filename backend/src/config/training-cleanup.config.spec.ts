import { describe, expect, it } from 'vitest';
import { readCleanupConfigFromEnv } from './cleanup.config';
import { readTrainingAutoCloseConfigFromEnv } from './training-auto-close.config';
import { readTrainingCleanupConfigFromEnv } from './training-cleanup.config';

describe('readTrainingCleanupConfigFromEnv', () => {
    it('gives nothing when no variable is set (the app setting default applies)', () => {
        expect(readTrainingCleanupConfigFromEnv({})).toBeUndefined();
    });

    it('follows the environment variables', () => {
        expect(
            readTrainingCleanupConfigFromEnv({
                TRAINING_CLEANUP_ENABLED: 'false',
                TRAINING_CLEANUP_CRON_EXPRESSION: '0 4 * * 0',
                TRAINING_CLEANUP_RETENTION_DAYS: '30',
            }),
        ).toEqual({
            value: { enabled: false, cronExpression: '0 4 * * 0', retentionDays: 30 },
            sourceDetail:
                'TRAINING_CLEANUP_ENABLED, TRAINING_CLEANUP_CRON_EXPRESSION, TRAINING_CLEANUP_RETENTION_DAYS',
        });
    });

    it('fills the unset variables of a partial group with their default', () => {
        expect(readTrainingCleanupConfigFromEnv({ TRAINING_CLEANUP_RETENTION_DAYS: '3' })).toEqual({
            value: { enabled: true, cronExpression: '0 6 * * 1', retentionDays: 3 },
            sourceDetail: 'TRAINING_CLEANUP_RETENTION_DAYS',
        });
    });
});

describe('readTrainingAutoCloseConfigFromEnv', () => {
    it('gives nothing when no variable is set', () => {
        expect(readTrainingAutoCloseConfigFromEnv({})).toBeUndefined();
    });

    it('fills a partial group with the defaults', () => {
        expect(readTrainingAutoCloseConfigFromEnv({ TRAINING_AUTOCLOSE_IDLE_HOURS: '12' })).toEqual(
            {
                value: { enabled: true, cronExpression: '0 10 * * *', idleHours: 12 },
                sourceDetail: 'TRAINING_AUTOCLOSE_IDLE_HOURS',
            },
        );
    });
});

describe('readCleanupConfigFromEnv', () => {
    it('gives nothing when no variable is set', () => {
        expect(readCleanupConfigFromEnv({ OTHER: 'x' })).toBeUndefined();
    });

    it('reads one rule and keeps the defaults of the others', () => {
        const result = readCleanupConfigFromEnv({
            CLEANUP_DRAFT_ENABLED: 'false',
            CLEANUP_DRAFT_MAX_FUTURE_DAYS: '100',
        });
        expect(result?.sourceDetail).toBe('CLEANUP_DRAFT_ENABLED, CLEANUP_DRAFT_MAX_FUTURE_DAYS');
        expect(result?.value).toEqual({
            enabled: true,
            cronExpression: '0 3 * * *',
            completed: { enabled: true, retentionDays: 7 },
            draft: { enabled: false, retentionDays: 7, maxFutureDays: 100 },
            active: { enabled: true, retentionDays: 7 },
        });
    });
});
