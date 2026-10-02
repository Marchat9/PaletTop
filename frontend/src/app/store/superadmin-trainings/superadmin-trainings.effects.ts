import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { catchError, map, of, switchMap, withLatestFrom } from 'rxjs';
import { SuperAdminTrainingService } from 'src/app/services/super-admin-training.service';
import { convertErrorToString } from 'src/app/utils/api-call.utils';
import { selectSuperAdminPassword } from 'src/app/store/superadmin/superadmin.selectors';
import { loadMetrics } from 'src/app/store/metrics/metrics.actions';
import {
  deleteSuperAdminTrainings,
  deleteSuperAdminTrainingsFailure,
  deleteSuperAdminTrainingsSuccess,
  loadSuperAdminTrainingDetail,
  loadSuperAdminTrainingDetailFailure,
  loadSuperAdminTrainingDetailSuccess,
  resetSuperAdminTrainingPassword,
  resetSuperAdminTrainingPasswordFailure,
  resetSuperAdminTrainingPasswordSuccess,
  searchSuperAdminTrainings,
  searchSuperAdminTrainingsFailure,
  searchSuperAdminTrainingsSuccess,
} from './superadmin-trainings.actions';
import { selectSuperAdminTrainingsList } from './superadmin-trainings.selectors';

@Injectable()
export class SuperAdminTrainingsEffects {
  private readonly actions$ = inject(Actions);
  private readonly store = inject(Store);
  private readonly trainingService = inject(SuperAdminTrainingService);

  search$ = createEffect(() =>
    this.actions$.pipe(
      ofType(searchSuperAdminTrainings),
      withLatestFrom(this.store.select(selectSuperAdminPassword)),
      switchMap(([{ criteria }, password]) =>
        this.trainingService
          .search({
            password: password ?? '',
            page: criteria.page,
            pageSize: criteria.pageSize,
            search: criteria.search || undefined,
            sortBy: criteria.sortBy,
            sortDir: criteria.sortDir,
          })
          .pipe(
            map(({ items, total }) => searchSuperAdminTrainingsSuccess({ items, total })),
            catchError((error) =>
              of(searchSuperAdminTrainingsFailure({ error: convertErrorToString(error) })),
            ),
          ),
      ),
    ),
  );

  detail$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadSuperAdminTrainingDetail),
      withLatestFrom(this.store.select(selectSuperAdminPassword)),
      switchMap(([{ id }, password]) =>
        this.trainingService.detail(id, password ?? '').pipe(
          map((training) => loadSuperAdminTrainingDetailSuccess({ training })),
          catchError((error) =>
            of(loadSuperAdminTrainingDetailFailure({ error: convertErrorToString(error) })),
          ),
        ),
      ),
    ),
  );

  delete$ = createEffect(() =>
    this.actions$.pipe(
      ofType(deleteSuperAdminTrainings),
      withLatestFrom(this.store.select(selectSuperAdminPassword)),
      switchMap(([{ ids }, password]) =>
        this.trainingService.delete(ids, password ?? '').pipe(
          map(() => deleteSuperAdminTrainingsSuccess()),
          catchError((error) =>
            of(deleteSuperAdminTrainingsFailure({ error: convertErrorToString(error) })),
          ),
        ),
      ),
    ),
  );

  resetPassword$ = createEffect(() =>
    this.actions$.pipe(
      ofType(resetSuperAdminTrainingPassword),
      withLatestFrom(this.store.select(selectSuperAdminPassword)),
      switchMap(([{ id, newPassword }, password]) =>
        this.trainingService.resetPassword(id, newPassword, password ?? '').pipe(
          map(() => resetSuperAdminTrainingPasswordSuccess()),
          catchError((error) =>
            of(resetSuperAdminTrainingPasswordFailure({ error: convertErrorToString(error) })),
          ),
        ),
      ),
    ),
  );

  // Re-run the last search after any mutation succeeds, so the table reflects
  // the change without the caller needing to remember to re-dispatch.
  refreshAfterMutation$ = createEffect(() =>
    this.actions$.pipe(
      ofType(deleteSuperAdminTrainingsSuccess, resetSuperAdminTrainingPasswordSuccess),
      withLatestFrom(this.store.select(selectSuperAdminTrainingsList)),
      map(([, list]) => searchSuperAdminTrainings({ criteria: list.criteria })),
    ),
  );

  // Deleting a training also deletes its sessions, so the training tiles change.
  refreshMetricsAfterDelete$ = createEffect(() =>
    this.actions$.pipe(
      ofType(deleteSuperAdminTrainingsSuccess),
      map(() => loadMetrics()),
    ),
  );
}
