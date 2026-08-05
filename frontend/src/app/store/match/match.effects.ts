import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { catchError, debounceTime, filter, map, of, switchMap, withLatestFrom } from 'rxjs';
import { TournamentStatus } from 'src/app/models/tournament-status.enum';
import { MatchService } from 'src/app/services/match.service';
import { addNotification } from 'src/app/store/app-config/app-config.actions';
import { loadTournamentInformationSuccess } from 'src/app/store/tournament/tournament.actions';
import {
  selectCurrentTournamentAdminInformations,
  selectCurrentTournamentData,
} from 'src/app/store/tournament/tournament.selectors';
import { convertErrorToString } from 'src/app/utils/api-call.utils';
import {
  adminUpdateScore,
  adminUpdateScoreFailure,
  adminUpdateScoreSuccess,
  loadCurrentMatch,
  loadCurrentMatchFailure,
  loadCurrentMatchSuccess,
  startMatch,
  startMatchFailure,
  startMatchSuccess,
  updateScore,
  updateScoreFailure,
  updateScoreSuccess,
  validateMatch,
  validateMatchFailure,
  validateMatchSuccess,
} from './match.actions';
import { environment } from '@environment';

@Injectable()
export class MatchEffects {
  private readonly actions$ = inject(Actions);
  private readonly store = inject(Store);
  private readonly matchService = inject(MatchService);

  loadCurrentMatchOnPlayerConnect$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadTournamentInformationSuccess),
      filter(({ tournament }) => tournament.status !== TournamentStatus.DRAFT),
      map(({ tournament, teamCode }) =>
        loadCurrentMatch({ tournamentCode: tournament.code, teamCode }),
      ),
    ),
  );

  loadCurrentMatch$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadCurrentMatch),
      switchMap(({ tournamentCode, teamCode }) =>
        this.matchService.getCurrentMatch(tournamentCode, teamCode).pipe(
          map((match) => loadCurrentMatchSuccess({ match })),
          catchError((error) =>
            of(loadCurrentMatchFailure({ error: convertErrorToString(error) })),
          ),
        ),
      ),
    ),
  );

  startMatch$ = createEffect(() =>
    this.actions$.pipe(
      ofType(startMatch),
      withLatestFrom(this.store.select(selectCurrentTournamentData)),
      switchMap(([{ matchId, teamCode }, tournament]) =>
        this.matchService.startMatch(tournament!.code, matchId, teamCode).pipe(
          map(() => startMatchSuccess()),
          catchError((error) => of(startMatchFailure({ error: convertErrorToString(error) }))),
        ),
      ),
    ),
  );

  updateScore$ = createEffect(() =>
    this.actions$.pipe(
      ofType(updateScore),
      debounceTime(environment.apiConfiguration.delayToUpdateScore ?? 0),
      withLatestFrom(this.store.select(selectCurrentTournamentData)),
      switchMap(([{ matchId, teamCode, scoreA, scoreB }, tournament]) =>
        this.matchService.updateScore(tournament!.code, matchId, teamCode, scoreA, scoreB).pipe(
          map(() => updateScoreSuccess()),
          catchError((error) => of(updateScoreFailure({ error: convertErrorToString(error) }))),
        ),
      ),
    ),
  );

  validateMatch$ = createEffect(() =>
    this.actions$.pipe(
      ofType(validateMatch),
      withLatestFrom(this.store.select(selectCurrentTournamentData)),
      switchMap(([{ matchId, teamCode, opponentTeamCode }, tournament]) =>
        this.matchService.validateMatch(tournament!.code, matchId, teamCode, opponentTeamCode).pipe(
          map(() => validateMatchSuccess()),
          catchError((error) => of(validateMatchFailure({ error: convertErrorToString(error) }))),
        ),
      ),
    ),
  );

  adminUpdateScore$ = createEffect(() =>
    this.actions$.pipe(
      ofType(adminUpdateScore),
      withLatestFrom(this.store.select(selectCurrentTournamentAdminInformations)),
      switchMap(([{ matchId, scoreA, scoreB }, adminInfo]) =>
        this.matchService
          .adminUpdateScore(adminInfo!.code, adminInfo!.password, matchId, scoreA, scoreB)
          .pipe(
            map(() => adminUpdateScoreSuccess()),
            catchError((error) =>
              of(adminUpdateScoreFailure({ error: convertErrorToString(error) })),
            ),
          ),
      ),
    ),
  );

  scoreActionErrors$ = createEffect(() =>
    this.actions$.pipe(
      ofType(startMatchFailure, updateScoreFailure, validateMatchFailure, adminUpdateScoreFailure),
      map(({ error }) =>
        addNotification({
          notification: {
            id: crypto.randomUUID(),
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
