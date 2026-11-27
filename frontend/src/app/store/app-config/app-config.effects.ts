import { DOCUMENT, inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType, ROOT_EFFECTS_INIT } from '@ngrx/effects';
import { of, switchMap, tap } from 'rxjs';
import { ThemeMode } from 'src/app/models/theme-mode.model';
import {
  addNotification,
  clearLocalStorageData,
  removeLocalStorageData,
  setLocalStorageData,
  setTheme,
  updateLocalStorageData,
} from './app-config.actions';
import { Action } from '@ngrx/store';
import { ToastrService } from 'ngx-toastr';
import { withoutExpiredRoundSkips } from './round-confirmation';

const THEME_STORAGE_KEY = 'app-theme';
const LOCAL_STORAGE_DATA_KEY = 'app-local-storage-data';

//
export const STORAGE_TOURNAMENT_CODE_KEY = 'tournament-code';
export const STORAGE_TOURNAMENT_PASSWORD_KEY = 'tournament-pass';
export const STORAGE_TOURNAMENT_PLAYER_CODE_KEY = 'tournament-player-code';
export const STORAGE_TOURNAMENT_TEAM_CODE_KEY = 'tournament-team-code';

export const STORAGE_FRIENDLY_MATCH_KEY = 'friendly-match-state';

export const STORAGE_TRAINING_CODE_KEY = 'training-code';
export const STORAGE_TRAINING_PASSWORD_KEY = 'training-pass';

export const STORAGE_TRAINING_SESSION_CODE_KEY = 'training-session-code';
export const STORAGE_TRAINING_SESSION_PLAYER_CODE_KEY = 'training-player-code';

/**
 * Rewrites the cached data from what the storage holds now (another tab may have written since).
 * A storage that refuses to write (private mode, full quota) only costs the persistence: the store
 * keeps the value for this page, and the effect stream must not die on it.
 */
function writeStoredData(
  update: (current: Record<string, unknown>) => Record<string, unknown>,
): void {
  try {
    const current = JSON.parse(localStorage.getItem(LOCAL_STORAGE_DATA_KEY) || '{}');
    localStorage.setItem(LOCAL_STORAGE_DATA_KEY, JSON.stringify(update(current)));
  } catch (e) {
    console.error('Failed to write localStorage data:', e);
  }
}

@Injectable()
export class AppConfigEffects {
  private readonly actions$ = inject(Actions);
  private readonly doc = inject(DOCUMENT);
  private readonly toastr = inject(ToastrService);

  initAppConfig$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ROOT_EFFECTS_INIT),
      switchMap(() => {
        const actionList: Action[] = [];

        // Load theme from localStorage
        const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
        if (savedTheme) {
          actionList.push(setTheme({ theme: savedTheme as ThemeMode }));
        }

        // Load localStorage data
        const savedData = localStorage.getItem(LOCAL_STORAGE_DATA_KEY);
        if (savedData) {
          try {
            const parsedData = JSON.parse(savedData);
            // Round opt-outs only last 24 hours: the expired ones are dropped for good.
            const data = withoutExpiredRoundSkips(parsedData, Date.now());
            if (Object.keys(data).length !== Object.keys(parsedData).length) {
              writeStoredData(() => data);
            }
            if (Object.keys(data).length > 0) {
              actionList.push(updateLocalStorageData({ data }));
            }
          } catch (e) {
            console.error('Failed to parse localStorage data:', e);
          }
        }
        return of(...actionList);
      }),
    ),
  );

  persistTheme$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(setTheme),
        tap(({ theme }) => localStorage.setItem(THEME_STORAGE_KEY, theme)),
        tap(({ theme }) => this.doc.documentElement.setAttribute('data-theme', theme)),
      ),
    { dispatch: false },
  );

  persistLocalStorageData$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(setLocalStorageData),
        tap(({ key, value }) => writeStoredData((current) => ({ ...current, [key]: value }))),
      ),
    { dispatch: false },
  );

  persistUpdateLocalStorageData$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(updateLocalStorageData),
        tap(({ data }) => writeStoredData((current) => ({ ...current, ...data }))),
      ),
    { dispatch: false },
  );

  removeLocalStorageData$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(removeLocalStorageData),
        tap(({ key }) =>
          writeStoredData((current) => {
            const { [key]: _, ...rest } = current;
            return rest;
          }),
        ),
      ),
    { dispatch: false },
  );

  clearLocalStorageData$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(clearLocalStorageData),
        tap(() => {
          localStorage.removeItem(LOCAL_STORAGE_DATA_KEY);
        }),
      ),
    { dispatch: false },
  );

  // Notifications
  addNotification$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(addNotification),
        tap(({ notification }) => {
          switch (notification.typeIcon) {
            case 'error':
              this.toastr.error(notification.message);
              break;
            case 'warning':
              this.toastr.warning(notification.message);
              break;
            case 'success':
              this.toastr.success(notification.message);
              break;
            case 'info':
            default:
              this.toastr.info(notification.message);
          }
        }),
      ),
    { dispatch: false },
  );
}
