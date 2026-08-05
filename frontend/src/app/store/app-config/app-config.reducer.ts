import { createReducer, on } from '@ngrx/store';
import {
  addNotification,
  clearLocalStorageData,
  clearNotifications,
  removeLocalStorageData,
  removeNotification,
  setLocalStorageData,
  setTheme,
  updateLocalStorageData,
} from './app-config.actions';
import { AppConfigState } from './app-config.model';

export const initialAppConfigState: AppConfigState = {
  theme: 'dark',
  notifications: [],
  localStorageData: {},
};

export const appConfigReducer = createReducer(
  initialAppConfigState,
  on(setTheme, (state, { theme }) => ({
    ...state,
    theme,
  })),
  on(addNotification, (state, { notification }) => ({
    ...state,
    notifications: [...state.notifications, notification],
  })),
  on(removeNotification, (state, { id }) => ({
    ...state,
    notifications: state.notifications.filter((n) => n.id !== id),
  })),
  on(clearNotifications, (state) => ({
    ...state,
    notifications: [],
  })),
  on(setLocalStorageData, (state, { key, value }) => ({
    ...state,
    localStorageData: {
      ...state.localStorageData,
      [key]: value,
    },
  })),
  on(updateLocalStorageData, (state, { data }) => ({
    ...state,
    localStorageData: {
      ...state.localStorageData,
      ...data,
    },
  })),
  on(removeLocalStorageData, (state, { key }) => {
    const { [key]: _, ...rest } = state.localStorageData;
    return {
      ...state,
      localStorageData: rest,
    };
  }),
  on(clearLocalStorageData, (state) => ({
    ...state,
    localStorageData: {},
  })),
);
