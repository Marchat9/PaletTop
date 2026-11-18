import { createReducer, on } from '@ngrx/store';
import {
  AppSettingDetailDto,
  AppSettingKey,
  AppSettingValues,
  PublicAppSettingDto,
} from 'src/app/models/app-setting.model';
import {
  loadPublicSettings,
  loadPublicSettingsFailure,
  loadPublicSettingsSuccess,
  loadSuperAdminSettings,
  loadSuperAdminSettingsFailure,
  loadSuperAdminSettingsSuccess,
  resetSetting,
  saveSettingFailure,
  saveSettingSuccess,
  updateSetting,
} from './app-settings.actions';

export interface AppSettingsState {
  /** Values known so far: public ones for everyone, all of them once the super-admin loaded. */
  values: Partial<AppSettingValues>;
  /** Every setting with its audit fields (super-admin only). */
  details: AppSettingDetailDto[];
  isLoading: boolean;
  error: string | null;
  /** Key of the setting being saved or reset, if any. */
  savingKey: AppSettingKey | null;
}

export const initialAppSettingsState: AppSettingsState = {
  values: {},
  details: [],
  isLoading: false,
  error: null,
  savingKey: null,
};

function mergeValues(
  values: Partial<AppSettingValues>,
  settings: PublicAppSettingDto[],
): Partial<AppSettingValues> {
  return settings.reduce<Partial<AppSettingValues>>(
    (merged, { key, value }) => ({ ...merged, [key]: value }),
    values,
  );
}

export const appSettingsReducer = createReducer(
  initialAppSettingsState,
  on(loadPublicSettings, loadSuperAdminSettings, (state) => ({
    ...state,
    isLoading: true,
    error: null,
  })),
  on(loadPublicSettingsSuccess, (state, { settings }) => ({
    ...state,
    values: mergeValues(state.values, settings),
    isLoading: false,
  })),
  on(loadSuperAdminSettingsSuccess, (state, { settings }) => ({
    ...state,
    values: mergeValues(state.values, settings),
    details: settings,
    isLoading: false,
  })),
  on(loadPublicSettingsFailure, loadSuperAdminSettingsFailure, (state, { error }) => ({
    ...state,
    isLoading: false,
    error,
  })),
  on(updateSetting, resetSetting, (state, { key }) => ({ ...state, savingKey: key })),
  on(saveSettingSuccess, (state, { setting }) => ({
    ...state,
    values: mergeValues(state.values, [setting]),
    details: state.details.map((detail) => (detail.key === setting.key ? setting : detail)),
    savingKey: null,
  })),
  on(saveSettingFailure, (state) => ({ ...state, savingKey: null })),
);
