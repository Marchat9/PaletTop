import { createFeatureSelector, createSelector } from '@ngrx/store';
import { AppConfigState } from './app-config.model';
import { NO_SKIPPED_ROUND_CONFIRMATION, SkipRoundConfirmation } from './round-confirmation';

export const appConfigFeatureKey = 'AppConfig';

export const selectAppConfigState = createFeatureSelector<AppConfigState>(appConfigFeatureKey);

export const selectTheme = createSelector(selectAppConfigState, (state) => state.theme);

export const selectNotifications = createSelector(
  selectAppConfigState,
  (state) => state.notifications,
);

export const selectNotificationCount = createSelector(
  selectNotifications,
  (notifications) => notifications.length,
);

export const selectLocalStorageData = createSelector(
  selectAppConfigState,
  (state) => state.localStorageData,
);

export const selectLocalStorageDataByKey = (key: string) =>
  createSelector(selectLocalStorageData, (data) => data[key]);

/** Admin pages: tournaments and sessions whose new rounds start without a confirmation. */
export const SKIP_ROUND_CONFIRMATION_STORAGE_KEY = 'skipRoundConfirmation';
export const selectSkipRoundConfirmation = createSelector(
  selectLocalStorageData,
  (data): SkipRoundConfirmation => {
    const stored = data[SKIP_ROUND_CONFIRMATION_STORAGE_KEY] as Partial<SkipRoundConfirmation>;
    return isCodeList(stored?.tournament) && isCodeList(stored?.training)
      ? { tournament: stored.tournament, training: stored.training }
      : NO_SKIPPED_ROUND_CONFIRMATION;
  },
);

function isCodeList(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((code) => typeof code === 'string');
}

/** Spectator screens: whether the ranking opens on its podium (hidden unless turned on). */
export const SPECTATOR_PODIUM_STORAGE_KEY = 'spectatorShowPodium';
export const selectSpectatorShowPodium = createSelector(
  selectLocalStorageData,
  (data) => data[SPECTATOR_PODIUM_STORAGE_KEY] === true,
);
