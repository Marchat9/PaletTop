import { CompetitionMode, ScoreCalculation } from './tournament-configuration-detail.model';
import { FillThresholds } from './tournament-plan.model';

/** Mirror of the backend `AppSettingKey`. */
export type AppSettingKey =
  | 'score_calculations_by_mode'
  | 'tournament_cleanup'
  | 'training_cleanup'
  | 'training_auto_close'
  | 'training_level_history_depth'
  | 'max_consolation_count'
  | 'bracket_fill_thresholds';

export type AppSettingScope = 'public' | 'super_admin' | 'internal';

export type AppSettingSource = 'app_default' | 'super_admin' | 'migration' | 'env';

/** Score calculations offered at tournament creation, per competition mode (display order). */
export type ScoreCalculationsByMode = Record<CompetitionMode, ScoreCalculation[]>;

export interface CleanupRuleConfig {
  enabled: boolean;
  retentionDays: number;
}

export interface CleanupDraftRuleConfig extends CleanupRuleConfig {
  maxFutureDays: number;
}

export interface TournamentCleanupConfig {
  enabled: boolean;
  cronExpression: string;
  completed: CleanupRuleConfig;
  draft: CleanupDraftRuleConfig;
  active: CleanupRuleConfig;
}

export interface TrainingCleanupConfig {
  enabled: boolean;
  cronExpression: string;
  retentionDays: number;
}

export interface TrainingAutoCloseConfig {
  enabled: boolean;
  cronExpression: string;
  idleHours: number;
}

export interface AppSettingValues {
  score_calculations_by_mode: ScoreCalculationsByMode;
  tournament_cleanup: TournamentCleanupConfig;
  training_cleanup: TrainingCleanupConfig;
  training_auto_close: TrainingAutoCloseConfig;
  training_level_history_depth: number;
  max_consolation_count: number;
  bracket_fill_thresholds: FillThresholds;
}

export interface PublicAppSettingDto {
  key: AppSettingKey;
  value: unknown;
}

export interface AppSettingDetailDto extends PublicAppSettingDto {
  scope: AppSettingScope;
  source: AppSettingSource;
  sourceDetail: string | null;
  appVersion: string | null;
  updatedAt: string | null;
}

/** Same default as the backend: used until the public settings are loaded, or if they fail. */
export const DEFAULT_SCORE_CALCULATIONS_BY_MODE: ScoreCalculationsByMode = {
  standard: ['victory_goal_average', 'victory_best_defeats', 'victory_points_scored'],
  up_down: ['victory_goal_average', 'victory_best_defeats', 'victory_points_scored'],
  championship: ['tournament_score'],
};

/** Same defaults as the backend: used until the public settings are loaded, or if they fail. */
export const DEFAULT_MAX_CONSOLATION_COUNT = 4;
export const DEFAULT_BRACKET_FILL_THRESHOLDS: FillThresholds = {
  okRatio: 0.9,
  warningRatio: 0.75,
};
