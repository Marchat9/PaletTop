import { describe, expect, it } from 'vitest';
import { AppSettingKey, AppSettingScope } from 'src/enum/app-setting.enum';
import {
    APP_SETTING_DEFINITIONS,
    isValidCronExpression,
    validateBracketFillThresholds,
    validateCleanupConfig,
    validateLevelHistoryDepth,
    validateMaxConsolationCount,
    validateScoreCalculationsByMode,
    validateTrainingAutoCloseConfig,
    validateTrainingCleanupConfig,
} from './app-setting.definitions';

describe('APP_SETTING_DEFINITIONS', () => {
    it('has valid defaults for every key', () => {
        for (const key of Object.values(AppSettingKey)) {
            const definition = APP_SETTING_DEFINITIONS[key];
            expect(definition.validate(definition.defaultValue), key).toEqual([]);
        }
    });

    it('offers the three victory-based calculations to the standard and up-down modes, goal-average first', () => {
        const defaults =
            APP_SETTING_DEFINITIONS[AppSettingKey.SCORE_CALCULATIONS_BY_MODE].defaultValue;
        const expected = ['victory_goal_average', 'victory_best_defeats', 'victory_points_scored'];
        expect(defaults.standard).toEqual(expected);
        expect(defaults.up_down).toEqual(expected);
    });

    it('offers only « Points tournoi » to the championship by default', () => {
        expect(
            APP_SETTING_DEFINITIONS[AppSettingKey.SCORE_CALCULATIONS_BY_MODE].defaultValue
                .championship,
        ).toEqual(['tournament_score']);
    });
});

describe('validateScoreCalculationsByMode', () => {
    const valid = {
        standard: ['victory_goal_average', 'victory_points_scored'],
        up_down: ['victory_points_scored'],
        championship: ['tournament_score', 'victory_goal_average'],
    };

    it('accepts any calculation for any mode', () => {
        expect(validateScoreCalculationsByMode(valid)).toEqual([]);
    });

    it.each(['victory_ga', 'score', 'victory_buchholz_ga', 'score_buchholz_ga'])(
        'rejects the removed calculation « %s »',
        (removed) => {
            expect(validateScoreCalculationsByMode({ ...valid, standard: [removed] })).toHaveLength(
                1,
            );
        },
    );

    it('accepts the new calculations', () => {
        expect(
            validateScoreCalculationsByMode({
                ...valid,
                standard: ['victory_best_defeats'],
                up_down: ['victory_goal_average', 'victory_points_scored'],
            }),
        ).toEqual([]);
    });

    it('requires at least one calculation per mode', () => {
        expect(validateScoreCalculationsByMode({ ...valid, up_down: [] })).toHaveLength(1);
        const { championship: _championship, ...withoutChampionship } = valid;
        expect(validateScoreCalculationsByMode(withoutChampionship)).toHaveLength(1);
    });

    it('rejects unknown modes, unknown calculations and duplicates', () => {
        expect(
            validateScoreCalculationsByMode({ ...valid, other: ['victory_points_scored'] }),
        ).toHaveLength(1);
        expect(validateScoreCalculationsByMode({ ...valid, standard: ['nope'] })).toHaveLength(1);
        expect(
            validateScoreCalculationsByMode({
                ...valid,
                standard: ['victory_points_scored', 'victory_points_scored'],
            }),
        ).toHaveLength(1);
        expect(validateScoreCalculationsByMode('victory_points_scored')).toHaveLength(1);
    });
});

describe('cron and cleanup validation', () => {
    it('checks cron expressions', () => {
        expect(isValidCronExpression('0 3 * * *')).toBe(true);
        expect(isValidCronExpression('every day')).toBe(false);
        expect(isValidCronExpression('')).toBe(false);
        expect(isValidCronExpression(3)).toBe(false);
    });

    it('validates the tournament cleanup', () => {
        const valid = {
            enabled: true,
            cronExpression: '0 3 * * *',
            completed: { enabled: true, retentionDays: 7 },
            draft: { enabled: true, retentionDays: 7, maxFutureDays: 365 },
            active: { enabled: false, retentionDays: 1 },
        };
        expect(validateCleanupConfig(valid)).toEqual([]);
        expect(validateCleanupConfig({ ...valid, cronExpression: 'x' })).toHaveLength(1);
        expect(
            validateCleanupConfig({ ...valid, completed: { enabled: true, retentionDays: 0 } }),
        ).toHaveLength(1);
        expect(
            validateCleanupConfig({ ...valid, draft: { enabled: true, retentionDays: 7 } }),
        ).toHaveLength(1);
        expect(validateCleanupConfig({ ...valid, extra: 1 })).toHaveLength(1);
    });

    it('validates the training cleanup, auto-close and level history depth', () => {
        expect(
            validateTrainingCleanupConfig({
                enabled: true,
                cronExpression: '0 6 * * 1',
                retentionDays: 2.5,
            }),
        ).toHaveLength(1);
        expect(
            validateTrainingAutoCloseConfig({
                enabled: 'yes',
                cronExpression: '0 10 * * *',
                idleHours: 24,
            }),
        ).toHaveLength(1);
        expect(validateLevelHistoryDepth(0)).toEqual([]);
        expect(validateLevelHistoryDepth(-1)).toHaveLength(1);
    });
});

describe('readEnv', () => {
    it('ignores an invalid TRAINING_LEVEL_HISTORY_DEPTH, as before', () => {
        const readEnv =
            APP_SETTING_DEFINITIONS[AppSettingKey.TRAINING_LEVEL_HISTORY_DEPTH].readEnv!;
        expect(readEnv({ TRAINING_LEVEL_HISTORY_DEPTH: 'abc' })).toBeUndefined();
        expect(readEnv({ TRAINING_LEVEL_HISTORY_DEPTH: '3' })?.value).toBe(3);
    });

    it('parses the score calculations JSON', () => {
        const readEnv = APP_SETTING_DEFINITIONS[AppSettingKey.SCORE_CALCULATIONS_BY_MODE].readEnv!;
        const env = readEnv({
            APP_SETTING_SCORE_CALCULATIONS_BY_MODE:
                '{"standard":["victory_points_scored"],"up_down":["victory_points_scored"],"championship":["tournament_score"]}',
        });
        expect(env?.value.standard).toEqual(['victory_points_scored']);
        // Invalid JSON is passed on as-is so that the validation rejects it.
        expect(readEnv({ APP_SETTING_SCORE_CALCULATIONS_BY_MODE: '{oops' })?.value).toBe('{oops');
    });
});

describe('structured bracket settings', () => {
    it('validates the max consolation count', () => {
        expect(validateMaxConsolationCount(1)).toEqual([]);
        expect(validateMaxConsolationCount(26)).toEqual([]);
        for (const invalid of [0, 27, 2.5, '4']) {
            expect(validateMaxConsolationCount(invalid), String(invalid)).toHaveLength(1);
        }
    });

    it('validates the bracket fill thresholds', () => {
        expect(validateBracketFillThresholds({ okRatio: 1, warningRatio: 0.51 })).toEqual([]);
        expect(validateBracketFillThresholds({ okRatio: 0.9, warningRatio: 0.5 })).not.toEqual([]);
        expect(validateBracketFillThresholds({ okRatio: 0.75, warningRatio: 0.75 })).not.toEqual(
            [],
        );
        expect(validateBracketFillThresholds({ okRatio: 1.2, warningRatio: 0.8 })).not.toEqual([]);
        expect(
            validateBracketFillThresholds({ okRatio: 0.9, warningRatio: 0.75, extra: 1 }),
        ).not.toEqual([]);
        expect(validateBracketFillThresholds({ okRatio: 0.9 })).not.toEqual([]);
        expect(validateBracketFillThresholds('x')).not.toEqual([]);
    });

    it('registers both settings as public with their defaults', () => {
        const max = APP_SETTING_DEFINITIONS[AppSettingKey.MAX_CONSOLATION_COUNT];
        const thresholds = APP_SETTING_DEFINITIONS[AppSettingKey.BRACKET_FILL_THRESHOLDS];
        expect(max.defaultValue).toBe(4);
        expect(max.scope).toBe(AppSettingScope.PUBLIC);
        expect(thresholds.defaultValue).toEqual({ okRatio: 0.9, warningRatio: 0.75 });
        expect(thresholds.scope).toBe(AppSettingScope.PUBLIC);
    });
});
