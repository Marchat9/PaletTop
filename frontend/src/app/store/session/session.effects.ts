import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { catchError, filter, map, of, switchMap, withLatestFrom } from 'rxjs';
import { TournamentStatus } from 'src/app/models/tournament-status.enum';
import { SessionService } from 'src/app/services/session.service';
import { convertErrorToString } from 'src/app/utils/api-call.utils';
import { connectTournamentAdministratorSuccess } from 'src/app/store/tournament/tournament.admin.actions';
import {
  nextSessionSuccess,
  startTournamentSuccess,
} from 'src/app/store/tournament/tournament.match.actions';
import { selectCurrentTournamentAdminInformations } from 'src/app/store/tournament/tournament.selectors';
import { adminUpdateScoreSuccess } from 'src/app/store/match/match.actions';
import { loadSessions, loadSessionsFailure, loadSessionsSuccess } from './session.actions';

@Injectable()
export class SessionEffects {
  private readonly actions$ = inject(Actions);
  private readonly store = inject(Store);
  private readonly sessionService = inject(SessionService);

  loadSessionsAfterAdminConnect$ = createEffect(() =>
    this.actions$.pipe(
      ofType(connectTournamentAdministratorSuccess),
      filter(({ tournament }) => tournament.status !== TournamentStatus.DRAFT),
      withLatestFrom(this.store.select(selectCurrentTournamentAdminInformations)),
      map(([, adminInfo]) => loadSessions({ code: adminInfo!.code })),
    ),
  );

  // The start and next round answers only carry the tournament: the rounds are reloaded over HTTP
  // rather than trusting the websocket alone, which may be down.
  loadSessionsAfterRoundCreated$ = createEffect(() =>
    this.actions$.pipe(
      ofType(startTournamentSuccess, nextSessionSuccess),
      map(({ tournament }) => loadSessions({ code: tournament.code })),
    ),
  );

  // The correction answer carries no match: the rounds are reloaded to show it without websocket.
  loadSessionsAfterAdminCorrection$ = createEffect(() =>
    this.actions$.pipe(
      ofType(adminUpdateScoreSuccess),
      withLatestFrom(this.store.select(selectCurrentTournamentAdminInformations)),
      filter(([, adminInfo]) => !!adminInfo?.code),
      map(([, adminInfo]) => loadSessions({ code: adminInfo!.code })),
    ),
  );

  loadSessions$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadSessions),
      switchMap(({ code }) =>
        this.sessionService.getSessions(code).pipe(
          map((sessions) => loadSessionsSuccess({ sessions })),
          catchError((error) => of(loadSessionsFailure({ error: convertErrorToString(error) }))),
        ),
      ),
    ),
  );
}
