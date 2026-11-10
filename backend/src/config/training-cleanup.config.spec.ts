import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import trainingCleanupConfig from './training-cleanup.config';

describe('trainingCleanupConfig', () => {
    const originalEnv = { ...process.env };

    beforeEach(() => {
        delete process.env.TRAINING_CLEANUP_ENABLED;
        delete process.env.TRAINING_CLEANUP_CRON_EXPRESSION;
        delete process.env.TRAINING_CLEANUP_RETENTION_DAYS;
    });

    afterEach(() => {
        process.env = { ...originalEnv };
    });

    it('runs every Monday morning by default, on sessions closed for a week', () => {
        expect(trainingCleanupConfig()).toEqual({
            enabled: true,
            cronExpression: '0 6 * * 1',
            retentionDays: 7,
        });
    });

    it('follows the environment variables', () => {
        process.env.TRAINING_CLEANUP_ENABLED = 'false';
        process.env.TRAINING_CLEANUP_CRON_EXPRESSION = '0 4 * * 0';
        process.env.TRAINING_CLEANUP_RETENTION_DAYS = '30';

        expect(trainingCleanupConfig()).toEqual({
            enabled: false,
            cronExpression: '0 4 * * 0',
            retentionDays: 30,
        });
    });
});
