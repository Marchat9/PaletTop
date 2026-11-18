import { CompetitionMode, ScoreCalculation } from './tournament-configuration-detail.model';

/** Mirror of the backend `AppSettingKey`. */
export type AppSettingKey =
  | 'score_calculations_by_mode'
  | 'tournament_cleanup'
  | 'training_cleanup'
  | 'training_auto_close'
  | 'training_level_history_depth';

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
  standard: ['victory_ga', 'score'],
  up_down: ['victory_ga', 'score'],
  championship: ['tournament_score'],
};
