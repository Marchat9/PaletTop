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

const THEME_STORAGE_KEY = 'app-theme';
const LOCAL_STORAGE_DATA_KEY = 'app-local-storage-data';

//
export const STORAGE_TOURNAMENT_CODE_KEY = 'tournament-code';
export const STORAGE_TOURNAMENT_PASSWORD_KEY = 'tournament-pass';

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
          console.debug('Found theme in localStorage:', savedTheme);
          actionList.push(setTheme({ theme: savedTheme as ThemeMode }));
        }

        // Load localStorage data
        const savedData = localStorage.getItem(LOCAL_STORAGE_DATA_KEY);
        if (savedData) {
          try {
            const parsedData = JSON.parse(savedData);
            if (Object.keys(parsedData).length > 0) {
              console.debug('Found localStorage data:', parsedData);
              actionList.push(updateLocalStorageData({ data: parsedData }));
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
        tap(({ key, value }) => {
          const currentData = JSON.parse(localStorage.getItem(LOCAL_STORAGE_DATA_KEY) || '{}');
          localStorage.setItem(
            LOCAL_STORAGE_DATA_KEY,
            JSON.stringify({ ...currentData, [key]: value }),
          );
        }),
      ),
    { dispatch: false },
  );

  persistUpdateLocalStorageData$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(updateLocalStorageData),
        tap(({ data }) => {
          const currentData = JSON.parse(localStorage.getItem(LOCAL_STORAGE_DATA_KEY) || '{}');
          localStorage.setItem(LOCAL_STORAGE_DATA_KEY, JSON.stringify({ ...currentData, ...data }));
        }),
      ),
    { dispatch: false },
  );

  removeLocalStorageData$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(removeLocalStorageData),
        tap(({ key }) => {
          const currentData = JSON.parse(localStorage.getItem(LOCAL_STORAGE_DATA_KEY) || '{}');
          const { [key]: _, ...rest } = currentData;
          localStorage.setItem(LOCAL_STORAGE_DATA_KEY, JSON.stringify(rest));
        }),
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
