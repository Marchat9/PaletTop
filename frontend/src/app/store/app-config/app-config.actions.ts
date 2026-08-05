import { createAction, props } from '@ngrx/store';
import { ThemeMode } from 'src/app/models/theme-mode.model';
import { Notification } from './app-config.model';

export const setTheme = createAction('[App Config] Set Theme', props<{ theme: ThemeMode }>());

export const addNotification = createAction(
  '[App Config] Add Notification',
  props<{ notification: Notification }>(),
);

export const removeNotification = createAction(
  '[App Config] Remove Notification',
  props<{ id: string }>(),
);

export const clearNotifications = createAction('[App Config] Clear Notifications');

export const setLocalStorageData = createAction(
  '[App Config] Set LocalStorage Data',
  props<{ key: string; value: unknown }>(),
);

export const updateLocalStorageData = createAction(
  '[App Config] Update LocalStorage Data',
  props<{ data: Record<string, unknown> }>(),
);

export const removeLocalStorageData = createAction(
  '[App Config] Remove LocalStorage Data',
  props<{ key: string }>(),
);

export const clearLocalStorageData = createAction('[App Config] Clear LocalStorage Data');
