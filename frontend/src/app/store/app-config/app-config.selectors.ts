import { createFeatureSelector, createSelector } from '@ngrx/store';
import { AppConfigState } from './app-config.model';

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
