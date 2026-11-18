import { createFeatureSelector, createSelector } from '@ngrx/store';
import { DEFAULT_SCORE_CALCULATIONS_BY_MODE } from 'src/app/models/app-setting.model';
import { AppSettingsState } from './app-settings.reducer';

export const appSettingsFeatureKey = 'appSettings';

export const selectAppSettingsState =
  createFeatureSelector<AppSettingsState>(appSettingsFeatureKey);

/** Never empty: falls back to the default while loading or when the call failed. */
export const selectScoreCalculationsByMode = createSelector(
  selectAppSettingsState,
  (state) => state.values.score_calculations_by_mode ?? DEFAULT_SCORE_CALCULATIONS_BY_MODE,
);

export const selectAppSettingDetails = createSelector(
  selectAppSettingsState,
  (state) => state.details,
);

export const selectSavingAppSettingKey = createSelector(
  selectAppSettingsState,
  (state) => state.savingKey,
);
