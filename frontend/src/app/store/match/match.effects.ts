import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import {
  catchError,
  concatMap,
  debounceTime,
  filter,
  map,
  of,
  switchMap,
  take,
  withLatestFrom,
} from 'rxjs';
import { TournamentStatus } from 'src/app/models/tournament-status.enum';
import { MatchService } from 'src/app/services/match.service';
import { addNotification } from 'src/app/store/app-config/app-config.actions';
import { loadTournamentInformationSuccess } from 'src/app/store/tournament/tournament.actions';
import {
  selectCurrentTournamentAdminInformations,
  selectCurrentTournamentData,
} from 'src/app/store/tournament/tournament.selectors';
import { convertErrorToString } from 'src/app/utils/api-call.utils';
import { withTimeoutAndOneRetry } from 'src/app/utils/reload-retry.util';
import {
  expectedScoreOf,
  isStaleScoreError,
  STALE_VALIDATION_MESSAGE,
  staleScoreNotification,
} from 'src/app/utils/stale-score.util';
import { selectCurrentMatch } from './match.selectors';
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
  updateScoreConflict,
  updateScoreFailure,
  updateScoreSuccess,
  validateMatch,
  validateMatchConflict,
  validateMatchFailure,
  validateMatchSuccess,
} from './match.actions';
import { environment } from '@environment';
import { newId } from 'src/app/utils/unique-id.util';

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
          withTimeoutAndOneRetry(),
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
          map((match) => startMatchSuccess({ match })),
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
      // concatMap, not switchMap: cancelling an HTTP call does not stop the server from processing
      // it, so two in-flight scores could be saved out of order. Sent one after the other, the
      // last score typed is the last one saved.
      // The base of the entry is read when the request leaves, after the previous one answered.
      concatMap(([request, tournament]) =>
        this.store.select(selectCurrentMatch).pipe(
          take(1),
          switchMap((current) =>
            this.matchService.updateScore(
              tournament!.code,
              request.matchId,
              request.teamCode,
              request.scoreA,
              request.scoreB,
              expectedScoreOf(current, request.matchId),
            ),
          ),
          map(({ match }) => updateScoreSuccess({ match })),
          catchError((error) =>
            isStaleScoreError(error)
              ? of(
                  updateScoreConflict(),
                  loadCurrentMatch({
                    tournamentCode: tournament!.code,
                    teamCode: request.teamCode,
                  }),
                  staleScoreNotification(),
                )
              : of(updateScoreFailure({ error: convertErrorToString(error) })),
          ),
        ),
      ),
    ),
  );

  validateMatch$ = createEffect(() =>
    this.actions$.pipe(
      ofType(validateMatch),
      withLatestFrom(this.store.select(selectCurrentTournamentData)),
      // The score on screen is sent with the validation: the server refuses it if it changed.
      switchMap(([{ matchId, teamCode, opponentTeamCode }, tournament]) =>
        this.store.select(selectCurrentMatch).pipe(
          take(1),
          switchMap((current) =>
            this.matchService.validateMatch(
              tournament!.code,
              matchId,
              teamCode,
              opponentTeamCode,
              expectedScoreOf(current, matchId),
            ),
          ),
          map(({ match }) => validateMatchSuccess({ match })),
          catchError((error) =>
            isStaleScoreError(error)
              ? of(
                  validateMatchConflict(),
                  loadCurrentMatch({ tournamentCode: tournament!.code, teamCode }),
                  staleScoreNotification(STALE_VALIDATION_MESSAGE),
                )
              : of(validateMatchFailure({ error: convertErrorToString(error) })),
          ),
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
