import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import {
  catchError,
  concatMap,
  debounceTime,
  filter,
  fromEvent,
  interval,
  map,
  merge,
  of,
  switchMap,
  timer,
  withLatestFrom,
} from 'rxjs';
import { TeamScoreUpdate } from 'src/app/models/score-update.model';
import {
  OFFLINE_SCORE_REJECTED_MESSAGE,
  PENDING_SCORE_RETRY_MS,
  SYNCED_BADGE_DURATION_MS,
} from 'src/app/models/score-sync.model';
import { resyncRequested } from 'src/app/store/realtime/realtime.actions';
import { selectScoreSync } from './match.selectors';
import { TournamentStatus } from 'src/app/models/tournament-status.enum';
import { MatchService } from 'src/app/services/match.service';
import { addNotification } from 'src/app/store/app-config/app-config.actions';
import { loadTournamentInformationSuccess } from 'src/app/store/tournament/tournament.actions';
import {
  selectCurrentTournamentAdminInformations,
  selectCurrentTournamentData,
} from 'src/app/store/tournament/tournament.selectors';
import { convertErrorToString, isNetworkError } from 'src/app/utils/api-call.utils';
import {
  adminUpdateScore,
  adminUpdateScoreFailure,
  adminUpdateScoreSuccess,
  loadCurrentMatch,
  loadCurrentMatchFailure,
  loadCurrentMatchSuccess,
  scoreSyncBadgeExpired,
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
      // concatMap, not switchMap: cancelling an HTTP call does not stop the server from processing
      // it, so two in-flight scores could be saved out of order. Sent one after the other, the
      // last score typed is the last one saved.
      concatMap(([request, tournament]) =>
        this.matchService
          .updateScore(
            tournament!.code,
            request.matchId,
            request.teamCode,
            request.scoreA,
            request.scoreB,
          )
          .pipe(
            map(() => updateScoreSuccess()),
            catchError((error) =>
              of(
                updateScoreFailure({
                  error: convertErrorToString(error),
                  request,
                  offline: isNetworkError(error),
                }),
              ),
            ),
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

  /** A pending score is resent when the network comes back, and regularly until it gets through. */
  resendPendingScore$ = createEffect(() =>
    merge(
      this.actions$.pipe(ofType(resyncRequested)),
      fromEvent(window, 'online'),
      interval(PENDING_SCORE_RETRY_MS),
    ).pipe(
      withLatestFrom(this.store.select(selectScoreSync)),
      map(([, sync]) => sync.pending),
      filter((pending): pending is TeamScoreUpdate => !!pending),
      map((pending) => updateScore({ ...pending, fromOfflineQueue: true })),
    ),
  );

  hideSyncedBadge$ = createEffect(() =>
    this.actions$.pipe(
      ofType(updateScoreSuccess),
      withLatestFrom(this.store.select(selectScoreSync)),
      filter(([, sync]) => sync.status === 'synced'),
      switchMap(() => timer(SYNCED_BADGE_DURATION_MS).pipe(map(() => scoreSyncBadgeExpired()))),
    ),
  );

  /**
   * A score lost to the network is told by the badge, not by an error. A resent score refused by
   * the server (match validated meanwhile) gets its own explanation.
   */
  updateScoreErrors$ = createEffect(() =>
    this.actions$.pipe(
      ofType(updateScoreFailure),
      filter(({ offline }) => !offline),
      map(({ error, request }) =>
        addNotification({
          notification: {
            id: newId(),
            message: request.fromOfflineQueue ? OFFLINE_SCORE_REJECTED_MESSAGE : error,
            typeIcon: 'error',
            type: 'error',
            createdAt: Date.now(),
          },
        }),
      ),
    ),
  );

  scoreActionErrors$ = createEffect(() =>
    this.actions$.pipe(
      ofType(startMatchFailure, validateMatchFailure, adminUpdateScoreFailure),
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
