import { CronTime } from 'cron';
import {
    CleanupConfig,
    DEFAULT_CLEANUP_CONFIG,
    readCleanupConfigFromEnv,
} from 'src/config/cleanup.config';
import { EnvValue } from 'src/config/config.utils';
import {
    DEFAULT_TRAINING_AUTO_CLOSE_CONFIG,
    readTrainingAutoCloseConfigFromEnv,
    TrainingAutoCloseConfig,
} from 'src/config/training-auto-close.config';
import {
    DEFAULT_TRAINING_CLEANUP_CONFIG,
    readTrainingCleanupConfigFromEnv,
    TrainingCleanupConfig,
} from 'src/config/training-cleanup.config';
import { AppSettingKey, AppSettingScope } from 'src/enum/app-setting.enum';
import { CompetitionMode, ScoreCalculation } from 'src/enum/tounament.enum';

/** Score calculations offered at tournament creation, per competition mode (display order). */
export type ScoreCalculationsByMode = Record<CompetitionMode, ScoreCalculation[]>;

export interface AppSettingValues {
    [AppSettingKey.SCORE_CALCULATIONS_BY_MODE]: ScoreCalculationsByMode;
    [AppSettingKey.TOURNAMENT_CLEANUP]: CleanupConfig;
    [AppSettingKey.TRAINING_CLEANUP]: TrainingCleanupConfig;
    [AppSettingKey.TRAINING_AUTO_CLOSE]: TrainingAutoCloseConfig;
    [AppSettingKey.TRAINING_LEVEL_HISTORY_DEPTH]: number;
}

export interface AppSettingDefinition<K extends AppSettingKey> {
    scope: AppSettingScope;
    defaultValue: AppSettingValues[K];
    /** Value built from env vars; undefined when none of them is set. */
    readEnv?(env: NodeJS.ProcessEnv): EnvValue<AppSettingValues[K]> | undefined;
    /** Error messages, empty when the value is valid. */
    validate(value: unknown): string[];
}

export type AppSettingDefinitions = { [K in AppSettingKey]: AppSettingDefinition<K> };

// ========= Validators =========

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function checkBoolean(errors: string[], value: unknown, label: string): void {
    if (typeof value !== 'boolean') errors.push(`${label} doit être un booléen.`);
}

function checkInteger(errors: string[], value: unknown, label: string, min: number): void {
    if (typeof value !== 'number' || !Number.isInteger(value) || value < min) {
        errors.push(`${label} doit être un entier supérieur ou égal à ${min}.`);
    }
}

export function isValidCronExpression(value: unknown): boolean {
    if (typeof value !== 'string' || !value.trim()) return false;
    try {
        new CronTime(value);
        return true;
    } catch {
        return false;
    }
}

function checkCron(errors: string[], value: unknown, label: string): void {
    if (!isValidCronExpression(value))
        errors.push(`${label} n'est pas une expression cron valide.`);
}

function checkKeys(errors: string[], value: Record<string, unknown>, keys: string[]): void {
    const unknownKeys = Object.keys(value).filter((key) => !keys.includes(key));
    if (unknownKeys.length) errors.push(`Clés inconnues : ${unknownKeys.join(', ')}.`);
}

export function validateScoreCalculationsByMode(value: unknown): string[] {
    if (!isRecord(value)) return ['La valeur doit être un objet par mode de compétition.'];
    const errors: string[] = [];
    const modes = Object.values(CompetitionMode) as string[];
    const calculations = Object.values(ScoreCalculation) as string[];
    checkKeys(errors, value, modes);

    for (const mode of modes) {
        const list = value[mode];
        if (!Array.isArray(list) || !list.length) {
            errors.push(`Le mode « ${mode} » doit proposer au moins un calcul des scores.`);
            continue;
        }
        if (list.some((calculation) => !calculations.includes(calculation as string))) {
            errors.push(`Le mode « ${mode} » contient un calcul des scores inconnu.`);
        }
        if (new Set(list).size !== list.length) {
            errors.push(`Le mode « ${mode} » contient un calcul des scores en double.`);
        }
    }
    return errors;
}

function validateRule(
    errors: string[],
    value: unknown,
    label: string,
    withMaxFutureDays = false,
): void {
    if (!isRecord(value)) {
        errors.push(`${label} : configuration manquante.`);
        return;
    }
    const keys = ['enabled', 'retentionDays', ...(withMaxFutureDays ? ['maxFutureDays'] : [])];
    checkKeys(errors, value, keys);
    checkBoolean(errors, value.enabled, `${label} : l'activation`);
    checkInteger(errors, value.retentionDays, `${label} : la durée de conservation`, 1);
    if (withMaxFutureDays) {
        checkInteger(errors, value.maxFutureDays, `${label} : le délai maximum dans le futur`, 1);
    }
}

export function validateCleanupConfig(value: unknown): string[] {
    if (!isRecord(value)) return ['La valeur doit être un objet.'];
    const errors: string[] = [];
    checkKeys(errors, value, ['enabled', 'cronExpression', 'completed', 'draft', 'active']);
    checkBoolean(errors, value.enabled, "L'activation");
    checkCron(errors, value.cronExpression, 'La planification');
    validateRule(errors, value.completed, 'Tournois terminés');
    validateRule(errors, value.draft, 'Tournois brouillons', true);
    validateRule(errors, value.active, 'Tournois actifs');
    return errors;
}

export function validateTrainingCleanupConfig(value: unknown): string[] {
    if (!isRecord(value)) return ['La valeur doit être un objet.'];
    const errors: string[] = [];
    checkKeys(errors, value, ['enabled', 'cronExpression', 'retentionDays']);
    checkBoolean(errors, value.enabled, "L'activation");
    checkCron(errors, value.cronExpression, 'La planification');
    checkInteger(errors, value.retentionDays, 'La durée de conservation', 1);
    return errors;
}

export function validateTrainingAutoCloseConfig(value: unknown): string[] {
    if (!isRecord(value)) return ['La valeur doit être un objet.'];
    const errors: string[] = [];
    checkKeys(errors, value, ['enabled', 'cronExpression', 'idleHours']);
    checkBoolean(errors, value.enabled, "L'activation");
    checkCron(errors, value.cronExpression, 'La planification');
    checkInteger(errors, value.idleHours, "La durée d'inactivité", 1);
    return errors;
}

export function validateLevelHistoryDepth(value: unknown): string[] {
    const errors: string[] = [];
    checkInteger(errors, value, "La profondeur d'historique", 0);
    return errors;
}

/** TRAINING_LEVEL_HISTORY_DEPTH: an invalid value is ignored, as it always was. */
function readLevelHistoryDepthFromEnv(env: NodeJS.ProcessEnv): EnvValue<number> | undefined {
    const raw = env.TRAINING_LEVEL_HISTORY_DEPTH?.trim();
    if (!raw) return undefined;
    const value = Number(raw);
    if (!Number.isInteger(value) || value < 0) return undefined;
    return { value, sourceDetail: 'TRAINING_LEVEL_HISTORY_DEPTH' };
}

function readScoreCalculationsFromEnv(
    env: NodeJS.ProcessEnv,
): EnvValue<ScoreCalculationsByMode> | undefined {
    const raw = env.APP_SETTING_SCORE_CALCULATIONS_BY_MODE?.trim();
    if (!raw) return undefined;
    let value: unknown;
    try {
        value = JSON.parse(raw);
    } catch {
        // Invalid JSON: kept as-is so that the validation reports it and the value is ignored.
        value = raw;
    }
    return {
        value: value as ScoreCalculationsByMode,
        sourceDetail: 'APP_SETTING_SCORE_CALCULATIONS_BY_MODE',
    };
}

// ========= Registry =========

export const DEFAULT_SCORE_CALCULATIONS_BY_MODE: ScoreCalculationsByMode = {
    [CompetitionMode.STANDARD]: [ScoreCalculation.VICTORY_AND_GOAL_AVERAGE, ScoreCalculation.SCORE],
    [CompetitionMode.UP_DOWN]: [
        ScoreCalculation.VICTORY_BUCHHOLZ_GOAL_AVERAGE,
        ScoreCalculation.SCORE_BUCHHOLZ_GOAL_AVERAGE,
    ],
    [CompetitionMode.CHAMPIONSHIP]: [ScoreCalculation.TOURNAMENT_SCORE],
};

export const DEFAULT_LEVEL_HISTORY_DEPTH = 5;

/** Every app setting: the code is the source of truth for keys, scopes, defaults and rules. */
export const APP_SETTING_DEFINITIONS: AppSettingDefinitions = {
    [AppSettingKey.SCORE_CALCULATIONS_BY_MODE]: {
        scope: AppSettingScope.PUBLIC,
        defaultValue: DEFAULT_SCORE_CALCULATIONS_BY_MODE,
        readEnv: readScoreCalculationsFromEnv,
        validate: validateScoreCalculationsByMode,
    },
    [AppSettingKey.TOURNAMENT_CLEANUP]: {
        scope: AppSettingScope.INTERNAL,
        defaultValue: DEFAULT_CLEANUP_CONFIG,
        readEnv: readCleanupConfigFromEnv,
        validate: validateCleanupConfig,
    },
    [AppSettingKey.TRAINING_CLEANUP]: {
        scope: AppSettingScope.INTERNAL,
        defaultValue: DEFAULT_TRAINING_CLEANUP_CONFIG,
        readEnv: readTrainingCleanupConfigFromEnv,
        validate: validateTrainingCleanupConfig,
    },
    [AppSettingKey.TRAINING_AUTO_CLOSE]: {
        scope: AppSettingScope.INTERNAL,
        defaultValue: DEFAULT_TRAINING_AUTO_CLOSE_CONFIG,
        readEnv: readTrainingAutoCloseConfigFromEnv,
        validate: validateTrainingAutoCloseConfig,
    },
    [AppSettingKey.TRAINING_LEVEL_HISTORY_DEPTH]: {
        scope: AppSettingScope.INTERNAL,
        defaultValue: DEFAULT_LEVEL_HISTORY_DEPTH,
        readEnv: readLevelHistoryDepthFromEnv,
        validate: validateLevelHistoryDepth,
    },
};

export function isAppSettingKey(key: string): key is AppSettingKey {
    return (Object.values(AppSettingKey) as string[]).includes(key);
}
