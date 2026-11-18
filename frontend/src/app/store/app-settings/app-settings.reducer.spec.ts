import {
  AppSettingDetailDto,
  DEFAULT_SCORE_CALCULATIONS_BY_MODE,
} from 'src/app/models/app-setting.model';
import {
  loadPublicSettingsSuccess,
  loadSuperAdminSettingsSuccess,
  saveSettingFailure,
  saveSettingSuccess,
  updateSetting,
} from './app-settings.actions';
import { appSettingsReducer, initialAppSettingsState } from './app-settings.reducer';
import { selectScoreCalculationsByMode } from './app-settings.selectors';

const SCORE_CALCULATIONS = {
  standard: ['score'],
  up_down: ['victory_ga'],
  championship: ['tournament_score'],
};

const DEPTH_DETAIL: AppSettingDetailDto = {
  key: 'training_level_history_depth',
  value: 5,
  scope: 'internal',
  source: 'app_default',
  sourceDetail: null,
  appVersion: null,
  updatedAt: null,
};

describe('appSettingsReducer', () => {
  it('stores the public values', () => {
    const state = appSettingsReducer(
      initialAppSettingsState,
      loadPublicSettingsSuccess({
        settings: [{ key: 'score_calculations_by_mode', value: SCORE_CALCULATIONS }],
      }),
    );

    expect(state.values.score_calculations_by_mode).toEqual(SCORE_CALCULATIONS);
    expect(state.details).toEqual([]);
  });

  it('merges the super-admin settings and keeps their details', () => {
    const state = appSettingsReducer(
      initialAppSettingsState,
      loadSuperAdminSettingsSuccess({ settings: [DEPTH_DETAIL] }),
    );

    expect(state.values.training_level_history_depth).toBe(5);
    expect(state.details).toEqual([DEPTH_DETAIL]);
  });

  it('tracks the setting being saved, then replaces it with the saved one', () => {
    const loaded = appSettingsReducer(
      initialAppSettingsState,
      loadSuperAdminSettingsSuccess({ settings: [DEPTH_DETAIL] }),
    );
    const saving = appSettingsReducer(
      loaded,
      updateSetting({ key: 'training_level_history_depth', value: 2 }),
    );
    expect(saving.savingKey).toBe('training_level_history_depth');

    const saved = appSettingsReducer(
      saving,
      saveSettingSuccess({
        setting: { ...DEPTH_DETAIL, value: 2, source: 'super_admin' },
        isReset: false,
      }),
    );
    expect(saved.savingKey).toBeNull();
    expect(saved.values.training_level_history_depth).toBe(2);
    expect(saved.details[0].source).toBe('super_admin');
  });

  it('clears the saving key on failure', () => {
    const state = appSettingsReducer(
      { ...initialAppSettingsState, savingKey: 'tournament_cleanup' },
      saveSettingFailure({ key: 'tournament_cleanup', error: 'boom' }),
    );
    expect(state.savingKey).toBeNull();
  });
});

describe('selectScoreCalculationsByMode', () => {
  it('falls back to the default until the settings are loaded', () => {
    expect(selectScoreCalculationsByMode.projector(initialAppSettingsState)).toEqual(
      DEFAULT_SCORE_CALCULATIONS_BY_MODE,
    );
  });
});
