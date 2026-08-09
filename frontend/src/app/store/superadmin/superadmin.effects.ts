import { HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { catchError, map, of, switchMap, takeUntil } from 'rxjs';
import { SuperAdminService } from 'src/app/services/super-admin.service';
import {
  clearSuperAdminSession,
  connectSuperAdmin,
  connectSuperAdminFailure,
  connectSuperAdminSuccess,
} from './superadmin.actions';

@Injectable()
export class SuperAdminEffects {
  private readonly actions$ = inject(Actions);
  private readonly superAdminService = inject(SuperAdminService);

  connectSuperAdmin$ = createEffect(() =>
    this.actions$.pipe(
      ofType(connectSuperAdmin),
      switchMap(({ password }) =>
        this.superAdminService.login(password).pipe(
          takeUntil(this.actions$.pipe(ofType(clearSuperAdminSession))),
          map(() => connectSuperAdminSuccess({ password })),
          catchError((error: unknown) => {
            let message: string;
            switch (true) {
              case error instanceof HttpErrorResponse && error.status === 429:
                message = 'Trop de tentatives. Veuillez réessayer plus tard.';
                break;
              case error instanceof HttpErrorResponse && error.status === 401:
                message = 'Mot de passe invalide';
                break;
              default:
                message = 'Erreur inconue';
                break;
            }
            return of(connectSuperAdminFailure({ error: message }));
          }),
        ),
      ),
    ),
  );
}
