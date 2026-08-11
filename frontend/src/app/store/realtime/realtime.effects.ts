import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { map, merge, switchMap, tap, withLatestFrom } from 'rxjs';
import { MatchesSessionDto } from 'src/app/models/matches-session.model';
import { MatchHistoryDto, PlayerMatchDto } from 'src/app/models/player-match.model';
import { GlobalRankingEntry } from 'src/app/models/global-ranking.model';
import { WebSocketService } from 'src/app/services/websocket.service';
import {
  leaveSpectatorPage,
  loadSpectatorTournamentSuccess,
} from 'src/app/store/spectator/spectator.actions';
import {
  createTournamentSuccess,
  disconnectTournamentAdministrator,
  loadTournamentInformationSuccess,
  resetTournament,
} from 'src/app/store/tournament/tournament.actions';
import { connectTournamentAdministratorSuccess } from 'src/app/store/tournament/tournament.admin.actions';
import { selectCurrentTournamentAdminInformations } from 'src/app/store/tournament/tournament.selectors';
import { TournamentDto } from 'src/app/store/tournament/tournament.models';
import {
  wsHistoryUpdated,
  wsMatchUpdated,
  wsRankingUpdated,
  wsSessionUpdated,
  wsTournamentUpdated,
} from './realtime.actions';

@Injectable()
export class RealtimeEffects {
  private readonly actions$ = inject(Actions);
  private readonly wsService = inject(WebSocketService);
  private readonly store = inject(Store);

  disconnectWebSocket$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(resetTournament, disconnectTournamentAdministrator, leaveSpectatorPage),
        tap(() => this.wsService.disconnect()),
      ),
    { dispatch: false },
  );

  connectWebSocketAdmin$ = createEffect(() =>
    this.actions$.pipe(
      ofType(createTournamentSuccess, connectTournamentAdministratorSuccess),
      withLatestFrom(this.store.select(selectCurrentTournamentAdminInformations)),
      switchMap(([{ tournament }, adminInfo]) => {
        this.wsService.connect(tournament.code, { password: adminInfo!.password });
        return this.computeWsEvents$();
      }),
    ),
  );

  connectWebSocketPlayer$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadTournamentInformationSuccess),
      switchMap(({ tournament, teamCode }) => {
        this.wsService.connect(tournament.code, { teamCode });
        return this.computeWsEvents$();
      }),
    ),
  );

  connectWebSocketSpectator$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadSpectatorTournamentSuccess),
      switchMap(({ tournament }) => {
        this.wsService.connect(tournament.code, {});
        return this.computeWsEvents$();
      }),
    ),
  );

  private computeWsEvents$() {
    return merge(
      this.wsService
        .on<PlayerMatchDto>('match:updated')
        .pipe(map((match) => wsMatchUpdated({ match }))),
      this.wsService
        .on<{ session: MatchesSessionDto }>('session:updated')
        .pipe(map(({ session }) => wsSessionUpdated({ session }))),
      this.wsService
        .on<{ tournament: TournamentDto }>('tournament:updated')
        .pipe(map(({ tournament }) => wsTournamentUpdated({ tournament }))),
      this.wsService
        .on<MatchHistoryDto[]>('history:updated')
        .pipe(map((history) => wsHistoryUpdated({ history }))),
      this.wsService
        .on<GlobalRankingEntry[]>('ranking:updated')
        .pipe(map((ranking) => wsRankingUpdated({ ranking }))),
    );
  }
}
