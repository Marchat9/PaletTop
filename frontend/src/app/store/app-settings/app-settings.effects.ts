import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { catchError, map, of, switchMap, withLatestFrom } from 'rxjs';
import { AppSettingsService } from 'src/app/services/app-settings.service';
import { addNotification } from 'src/app/store/app-config/app-config.actions';
import { selectSuperAdminPassword } from 'src/app/store/superadmin/superadmin.selectors';
import { convertErrorToString } from 'src/app/utils/api-call.utils';
import { newId } from 'src/app/utils/unique-id.util';
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

@Injectable()
export class AppSettingsEffects {
  private readonly actions$ = inject(Actions);
  private readonly store = inject(Store);
  private readonly appSettingsService = inject(AppSettingsService);

  loadPublic$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadPublicSettings),
      switchMap(() =>
        this.appSettingsService.getPublic().pipe(
          map((settings) => loadPublicSettingsSuccess({ settings })),
          catchError((error) =>
            of(loadPublicSettingsFailure({ error: convertErrorToString(error) })),
          ),
        ),
      ),
    ),
  );

  loadSuperAdmin$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadSuperAdminSettings),
      withLatestFrom(this.store.select(selectSuperAdminPassword)),
      switchMap(([, password]) =>
        this.appSettingsService.getAll(password ?? '').pipe(
          map((settings) => loadSuperAdminSettingsSuccess({ settings })),
          catchError((error) =>
            of(loadSuperAdminSettingsFailure({ error: convertErrorToString(error) })),
          ),
        ),
      ),
    ),
  );

  update$ = createEffect(() =>
    this.actions$.pipe(
      ofType(updateSetting),
      withLatestFrom(this.store.select(selectSuperAdminPassword)),
      switchMap(([{ key, value }, password]) =>
        this.appSettingsService.update(key, value, password ?? '').pipe(
          map((setting) => saveSettingSuccess({ setting, isReset: false })),
          catchError((error) =>
            of(saveSettingFailure({ key, error: convertErrorToString(error) })),
          ),
        ),
      ),
    ),
  );

  reset$ = createEffect(() =>
    this.actions$.pipe(
      ofType(resetSetting),
      withLatestFrom(this.store.select(selectSuperAdminPassword)),
      switchMap(([{ key }, password]) =>
        this.appSettingsService.reset(key, password ?? '').pipe(
          map((setting) => saveSettingSuccess({ setting, isReset: true })),
          catchError((error) =>
            of(saveSettingFailure({ key, error: convertErrorToString(error) })),
          ),
        ),
      ),
    ),
  );

  notifySaved$ = createEffect(() =>
    this.actions$.pipe(
      ofType(saveSettingSuccess),
      map(({ isReset }) =>
        addNotification({
          notification: {
            id: newId(),
            message: isReset ? 'Paramètre réinitialisé' : 'Paramètre enregistré',
            typeIcon: 'success',
            type: 'success',
            createdAt: Date.now(),
          },
        }),
      ),
    ),
  );

  notifyFailure$ = createEffect(() =>
    this.actions$.pipe(
      ofType(saveSettingFailure, loadSuperAdminSettingsFailure),
      map(({ error }) =>
        addNotification({
          notification: {
            id: newId(),
            message: error,
            typeIcon: 'error',
            type: 'error',
            createdAt: Date.now(),
          },
        }),
      ),
    ),
  );
}
