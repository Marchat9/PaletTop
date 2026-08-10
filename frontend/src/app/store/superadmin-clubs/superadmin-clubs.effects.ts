import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { catchError, map, of, switchMap, withLatestFrom } from 'rxjs';
import { SuperAdminClubService } from 'src/app/services/super-admin-club.service';
import { convertErrorToString } from 'src/app/utils/api-call.utils';
import { selectSuperAdminPassword } from 'src/app/store/superadmin/superadmin.selectors';
import { loadMetrics } from 'src/app/store/metrics/metrics.actions';
import {
  deleteSuperAdminClubs,
  deleteSuperAdminClubsFailure,
  deleteSuperAdminClubsSuccess,
  renameSuperAdminClub,
  renameSuperAdminClubFailure,
  renameSuperAdminClubSuccess,
  searchSuperAdminClubs,
  searchSuperAdminClubsFailure,
  searchSuperAdminClubsSuccess,
} from './superadmin-clubs.actions';
import { selectSuperAdminClubsList } from './superadmin-clubs.selectors';

@Injectable()
export class SuperAdminClubsEffects {
  private readonly actions$ = inject(Actions);
  private readonly store = inject(Store);
  private readonly clubService = inject(SuperAdminClubService);

  search$ = createEffect(() =>
    this.actions$.pipe(
      ofType(searchSuperAdminClubs),
      withLatestFrom(this.store.select(selectSuperAdminPassword)),
      switchMap(([{ criteria }, password]) =>
        this.clubService
          .search({
            password: password ?? '',
            page: criteria.page,
            pageSize: criteria.pageSize,
            search: criteria.search || undefined,
            sortBy: criteria.sortBy,
            sortDir: criteria.sortDir,
          })
          .pipe(
            map(({ items, total }) => searchSuperAdminClubsSuccess({ items, total })),
            catchError((error) =>
              of(searchSuperAdminClubsFailure({ error: convertErrorToString(error) })),
            ),
          ),
      ),
    ),
  );

  rename$ = createEffect(() =>
    this.actions$.pipe(
      ofType(renameSuperAdminClub),
      withLatestFrom(this.store.select(selectSuperAdminPassword)),
      switchMap(([{ id, name }, password]) =>
        this.clubService.rename(id, name, password ?? '').pipe(
          map(() => renameSuperAdminClubSuccess()),
          catchError((error) =>
            of(renameSuperAdminClubFailure({ error: convertErrorToString(error) })),
          ),
        ),
      ),
    ),
  );

  delete$ = createEffect(() =>
    this.actions$.pipe(
      ofType(deleteSuperAdminClubs),
      withLatestFrom(this.store.select(selectSuperAdminPassword)),
      switchMap(([{ ids }, password]) =>
        this.clubService.delete(ids, password ?? '').pipe(
          map(() => deleteSuperAdminClubsSuccess()),
          catchError((error) =>
            of(deleteSuperAdminClubsFailure({ error: convertErrorToString(error) })),
          ),
        ),
      ),
    ),
  );

  refreshAfterMutation$ = createEffect(() =>
    this.actions$.pipe(
      ofType(renameSuperAdminClubSuccess, deleteSuperAdminClubsSuccess),
      withLatestFrom(this.store.select(selectSuperAdminClubsList)),
      map(([, list]) => searchSuperAdminClubs({ criteria: list.criteria })),
    ),
  );

  // Renames don't move the needle on metrics, but a club deletion changes the
  // clubs count tile — reload metrics after any mutation so the tiles never
  // go stale.
  refreshMetricsAfterMutation$ = createEffect(() =>
    this.actions$.pipe(
      ofType(renameSuperAdminClubSuccess, deleteSuperAdminClubsSuccess),
      map(() => loadMetrics()),
    ),
  );
}
