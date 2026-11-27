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
import {
    CompetitionMode,
    EliminationSeeding,
    PairingMode,
    ScoreCalculation,
} from 'src/enum/tounament.enum';
import { FillThresholds } from 'src/modules/tournaments/strategies/structured/plan/plan.types';

/** Score calculations offered at tournament creation, per competition mode (display order). */
export type ScoreCalculationsByMode = Record<CompetitionMode, ScoreCalculation[]>;

/**
 * Option flagged « Recommandé » at tournament creation, for each choice that has one; null shows
 * no badge for that choice.
 */
export interface RecommendedOptions {
    scoreCalculation: ScoreCalculation | null;
    pairingMode: PairingMode | null;
    eliminationSeeding: EliminationSeeding | null;
}

export interface AppSettingValues {
    [AppSettingKey.SCORE_CALCULATIONS_BY_MODE]: ScoreCalculationsByMode;
    [AppSettingKey.TOURNAMENT_CLEANUP]: CleanupConfig;
    [AppSettingKey.TRAINING_CLEANUP]: TrainingCleanupConfig;
    [AppSettingKey.TRAINING_AUTO_CLOSE]: TrainingAutoCloseConfig;
    [AppSettingKey.TRAINING_LEVEL_HISTORY_DEPTH]: number;
    [AppSettingKey.MAX_CONSOLATION_COUNT]: number;
    [AppSettingKey.BRACKET_FILL_THRESHOLDS]: FillThresholds;
    [AppSettingKey.BYE_LOSER_SCORE_CAP]: number;
    [AppSettingKey.RECOMMENDED_OPTIONS]: RecommendedOptions;
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

export const MAX_CONSOLATION_COUNT_LIMIT = 26;

export function validateMaxConsolationCount(value: unknown): string[] {
    if (
        typeof value !== 'number' ||
        !Number.isInteger(value) ||
        value < 1 ||
        value > MAX_CONSOLATION_COUNT_LIMIT
    ) {
        return [
            `Le nombre maximum de consolantes doit être un entier entre 1 et ${MAX_CONSOLATION_COUNT_LIMIT}.`,
        ];
    }
    return [];
}

export const BYE_LOSER_SCORE_CAP_LIMIT = 12;

export function validateByeLoserScoreCap(value: unknown): string[] {
    if (
        typeof value !== 'number' ||
        !Number.isInteger(value) ||
        value < 0 ||
        value > BYE_LOSER_SCORE_CAP_LIMIT
    ) {
        return [
            `Le score du perdant d'un bye doit être un entier entre 0 et ${BYE_LOSER_SCORE_CAP_LIMIT}.`,
        ];
    }
    return [];
}

function checkOptionalChoice(
    errors: string[],
    value: unknown,
    choices: object,
    label: string,
): void {
    if (value !== null && !(Object.values(choices) as unknown[]).includes(value)) {
        errors.push(`${label} recommandé est inconnu.`);
    }
}

export function validateRecommendedOptions(value: unknown): string[] {
    if (!isRecord(value)) return ['La valeur doit être un objet.'];
    const errors: string[] = [];
    checkKeys(errors, value, ['scoreCalculation', 'pairingMode', 'eliminationSeeding']);
    checkOptionalChoice(errors, value.scoreCalculation, ScoreCalculation, 'Le calcul des scores');
    checkOptionalChoice(errors, value.pairingMode, PairingMode, "Le mode d'appariement");
    checkOptionalChoice(
        errors,
        value.eliminationSeeding,
        EliminationSeeding,
        'Le placement des phases éliminatoires',
    );
    return errors;
}

export function validateBracketFillThresholds(value: unknown): string[] {
    if (!isRecord(value)) return ['La valeur doit être un objet.'];
    const errors: string[] = [];
    checkKeys(errors, value, ['okRatio', 'warningRatio']);
    const { okRatio, warningRatio } = value;
    if (typeof okRatio !== 'number' || !Number.isFinite(okRatio)) {
        errors.push('Le seuil « bon remplissage » doit être un nombre.');
    }
    if (typeof warningRatio !== 'number' || !Number.isFinite(warningRatio)) {
        errors.push('Le seuil « avertissement » doit être un nombre.');
    }
    if (errors.length) return errors;
    if (!(
        0.5 < (warningRatio as number) &&
        (warningRatio as number) < (okRatio as number) &&
        (okRatio as number) <= 1
    )) {
        errors.push('Les seuils doivent respecter 0,5 < avertissement < bon remplissage ≤ 1.');
    }
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

/** Offered by the standard and up-down modes, the first one being the default. */
const NEW_SCORE_CALCULATIONS: ScoreCalculation[] = [
    ScoreCalculation.VICTORY_GOAL_AVERAGE,
    ScoreCalculation.VICTORY_BEST_DEFEATS,
    ScoreCalculation.VICTORY_POINTS_SCORED,
];

export const DEFAULT_SCORE_CALCULATIONS_BY_MODE: ScoreCalculationsByMode = {
    [CompetitionMode.STANDARD]: NEW_SCORE_CALCULATIONS,
    [CompetitionMode.UP_DOWN]: NEW_SCORE_CALCULATIONS,
    [CompetitionMode.CHAMPIONSHIP]: [ScoreCalculation.TOURNAMENT_SCORE],
};

export const DEFAULT_LEVEL_HISTORY_DEPTH = 5;
export const DEFAULT_MAX_CONSOLATION_COUNT = 4;
export const DEFAULT_BYE_LOSER_SCORE_CAP = 6;
export const DEFAULT_BRACKET_FILL_THRESHOLDS: FillThresholds = {
    okRatio: 0.9,
    warningRatio: 0.75,
};
export const DEFAULT_RECOMMENDED_OPTIONS: RecommendedOptions = {
    scoreCalculation: ScoreCalculation.VICTORY_GOAL_AVERAGE,
    pairingMode: PairingMode.DUTCH,
    eliminationSeeding: EliminationSeeding.PYRAMIDAL,
};

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
    [AppSettingKey.MAX_CONSOLATION_COUNT]: {
        scope: AppSettingScope.PUBLIC,
        defaultValue: DEFAULT_MAX_CONSOLATION_COUNT,
        validate: validateMaxConsolationCount,
    },
    [AppSettingKey.BRACKET_FILL_THRESHOLDS]: {
        scope: AppSettingScope.PUBLIC,
        defaultValue: DEFAULT_BRACKET_FILL_THRESHOLDS,
        validate: validateBracketFillThresholds,
    },
    [AppSettingKey.BYE_LOSER_SCORE_CAP]: {
        scope: AppSettingScope.INTERNAL,
        defaultValue: DEFAULT_BYE_LOSER_SCORE_CAP,
        validate: validateByeLoserScoreCap,
    },
    [AppSettingKey.RECOMMENDED_OPTIONS]: {
        scope: AppSettingScope.PUBLIC,
        defaultValue: DEFAULT_RECOMMENDED_OPTIONS,
        validate: validateRecommendedOptions,
    },
};

export function isAppSettingKey(key: string): key is AppSettingKey {
    return (Object.values(AppSettingKey) as string[]).includes(key);
}
