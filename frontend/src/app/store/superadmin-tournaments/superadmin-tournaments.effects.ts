import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { catchError, map, of, switchMap, withLatestFrom } from 'rxjs';
import { SuperAdminTournamentService } from 'src/app/services/super-admin-tournament.service';
import { convertErrorToString } from 'src/app/utils/api-call.utils';
import { selectSuperAdminPassword } from 'src/app/store/superadmin/superadmin.selectors';
import { loadMetrics } from 'src/app/store/metrics/metrics.actions';
import {
  changeSuperAdminTournamentsStatus,
  changeSuperAdminTournamentsStatusFailure,
  changeSuperAdminTournamentsStatusSuccess,
  deleteSuperAdminTournaments,
  deleteSuperAdminTournamentsFailure,
  deleteSuperAdminTournamentsSuccess,
  loadSuperAdminTournamentDetail,
  loadSuperAdminTournamentDetailFailure,
  loadSuperAdminTournamentDetailSuccess,
  resetSuperAdminTournamentPassword,
  resetSuperAdminTournamentPasswordFailure,
  resetSuperAdminTournamentPasswordSuccess,
  searchSuperAdminTournaments,
  searchSuperAdminTournamentsFailure,
  searchSuperAdminTournamentsSuccess,
} from './superadmin-tournaments.actions';
import { selectSuperAdminTournamentsList } from './superadmin-tournaments.selectors';

@Injectable()
export class SuperAdminTournamentsEffects {
  private readonly actions$ = inject(Actions);
  private readonly store = inject(Store);
  private readonly tournamentService = inject(SuperAdminTournamentService);

  search$ = createEffect(() =>
    this.actions$.pipe(
      ofType(searchSuperAdminTournaments),
      withLatestFrom(this.store.select(selectSuperAdminPassword)),
      switchMap(([{ criteria }, password]) =>
        this.tournamentService
          .search({
            password: password ?? '',
            page: criteria.page,
            pageSize: criteria.pageSize,
            search: criteria.search || undefined,
            status: criteria.status ?? undefined,
            sortBy: criteria.sortBy,
            sortDir: criteria.sortDir,
          })
          .pipe(
            map(({ items, total }) => searchSuperAdminTournamentsSuccess({ items, total })),
            catchError((error) =>
              of(searchSuperAdminTournamentsFailure({ error: convertErrorToString(error) })),
            ),
          ),
      ),
    ),
  );

  detail$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadSuperAdminTournamentDetail),
      withLatestFrom(this.store.select(selectSuperAdminPassword)),
      switchMap(([{ id }, password]) =>
        this.tournamentService.detail(id, password ?? '').pipe(
          map((tournament) => loadSuperAdminTournamentDetailSuccess({ tournament })),
          catchError((error) =>
            of(loadSuperAdminTournamentDetailFailure({ error: convertErrorToString(error) })),
          ),
        ),
      ),
    ),
  );

  delete$ = createEffect(() =>
    this.actions$.pipe(
      ofType(deleteSuperAdminTournaments),
      withLatestFrom(this.store.select(selectSuperAdminPassword)),
      switchMap(([{ ids }, password]) =>
        this.tournamentService.delete(ids, password ?? '').pipe(
          map(() => deleteSuperAdminTournamentsSuccess()),
          catchError((error) =>
            of(deleteSuperAdminTournamentsFailure({ error: convertErrorToString(error) })),
          ),
        ),
      ),
    ),
  );

  changeStatus$ = createEffect(() =>
    this.actions$.pipe(
      ofType(changeSuperAdminTournamentsStatus),
      withLatestFrom(this.store.select(selectSuperAdminPassword)),
      switchMap(([{ ids, status }, password]) =>
        this.tournamentService.changeStatus(ids, status, password ?? '').pipe(
          map(() => changeSuperAdminTournamentsStatusSuccess()),
          catchError((error) =>
            of(changeSuperAdminTournamentsStatusFailure({ error: convertErrorToString(error) })),
          ),
        ),
      ),
    ),
  );

  resetPassword$ = createEffect(() =>
    this.actions$.pipe(
      ofType(resetSuperAdminTournamentPassword),
      withLatestFrom(this.store.select(selectSuperAdminPassword)),
      switchMap(([{ id, newPassword }, password]) =>
        this.tournamentService.resetPassword(id, newPassword, password ?? '').pipe(
          map(() => resetSuperAdminTournamentPasswordSuccess()),
          catchError((error) =>
            of(resetSuperAdminTournamentPasswordFailure({ error: convertErrorToString(error) })),
          ),
        ),
      ),
    ),
  );

  // Re-run the last search after any mutation succeeds, so the table reflects
  // the change without the caller needing to remember to re-dispatch.
  refreshAfterMutation$ = createEffect(() =>
    this.actions$.pipe(
      ofType(
        deleteSuperAdminTournamentsSuccess,
        changeSuperAdminTournamentsStatusSuccess,
        resetSuperAdminTournamentPasswordSuccess,
      ),
      withLatestFrom(this.store.select(selectSuperAdminTournamentsList)),
      map(([, list]) => searchSuperAdminTournaments({ criteria: list.criteria })),
    ),
  );

  // Deletions and status changes shift the metrics tiles' counts — reload them
  // so the stat tiles never go stale after a mutation.
  refreshMetricsAfterMutation$ = createEffect(() =>
    this.actions$.pipe(
      ofType(
        deleteSuperAdminTournamentsSuccess,
        changeSuperAdminTournamentsStatusSuccess,
        resetSuperAdminTournamentPasswordSuccess,
      ),
      map(() => loadMetrics()),
    ),
  );
}
