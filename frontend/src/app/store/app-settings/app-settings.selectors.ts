import { createFeatureSelector, createSelector } from '@ngrx/store';
import {
  DEFAULT_BRACKET_FILL_THRESHOLDS,
  DEFAULT_MAX_CONSOLATION_COUNT,
  DEFAULT_SCORE_CALCULATIONS_BY_MODE,
} from 'src/app/models/app-setting.model';
import { AppSettingsState } from './app-settings.reducer';

export const appSettingsFeatureKey = 'appSettings';

export const selectAppSettingsState =
  createFeatureSelector<AppSettingsState>(appSettingsFeatureKey);

/** Never empty: falls back to the default while loading or when the call failed. */
export const selectScoreCalculationsByMode = createSelector(
  selectAppSettingsState,
  (state) => state.values.score_calculations_by_mode ?? DEFAULT_SCORE_CALCULATIONS_BY_MODE,
);

/** Highest consolation count the admin can pick; default while loading or on failure. */
export const selectMaxConsolationCount = createSelector(
  selectAppSettingsState,
  (state) => state.values.max_consolation_count ?? DEFAULT_MAX_CONSOLATION_COUNT,
);

/** Fill ratios of the bracket colours; default while loading or on failure. */
export const selectFillThresholds = createSelector(
  selectAppSettingsState,
  (state) => state.values.bracket_fill_thresholds ?? DEFAULT_BRACKET_FILL_THRESHOLDS,
);

export const selectAppSettingDetails = createSelector(
  selectAppSettingsState,
  (state) => state.details,
);

export const selectSavingAppSettingKey = createSelector(
  selectAppSettingsState,
  (state) => state.savingKey,
);
