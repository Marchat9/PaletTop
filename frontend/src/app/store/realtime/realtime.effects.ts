import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { debounceTime, map, merge, switchMap, tap, withLatestFrom } from 'rxjs';
import { MatchesSessionDto } from 'src/app/models/matches-session.model';
import { MatchHistoryDto, PlayerMatchDto } from 'src/app/models/player-match.model';
import { GlobalRankingEntry } from 'src/app/models/global-ranking.model';
import { AppVisibilityService } from 'src/app/services/app-visibility.service';
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
  resyncPending,
  resyncRequested,
  wsHistoryUpdated,
  wsMatchUpdated,
  wsRankingUpdated,
  wsSessionUpdated,
  wsTournamentUpdated,
  wsTrainingLeaderboardUpdated,
  wsTrainingMatchUpdated,
  wsTrainingRoundGenerated,
  wsTrainingSessionUpdated,
} from './realtime.actions';
import {
  disconnectTrainingAdministrator,
  loadTrainingParticipantCurrentMatchSuccess,
} from 'src/app/store/training/training.actions';
import {
  connectTrainingSessionAdministratorSuccess,
  leaveTrainingSession,
  spectateTrainingSession,
} from 'src/app/store/training/training.session.actions';
import { selectCurrentTrainingAdminInformations } from 'src/app/store/training/training.selectors';
import {
  TrainingLeaderboardEntryDto,
  TrainingMatchDto,
  TrainingRoundDto,
  TrainingSessionAdminDto,
  TrainingSessionPublicDto,
} from 'src/app/store/training/training.models';
import { environment } from '@environment';

@Injectable()
export class RealtimeEffects {
  private readonly actions$ = inject(Actions);
  private readonly wsService = inject(WebSocketService);
  private readonly appVisibility = inject(AppVisibilityService);
  private readonly store = inject(Store);

  resyncOnReconnect$ = createEffect(() =>
    merge(this.wsService.reconnected$, this.appVisibility.resumed$).pipe(
      debounceTime(environment.apiConfiguration.mobileResyncDebounce),
      map(() => resyncRequested()),
    ),
  );

  markResyncPending$ = createEffect(() =>
    merge(this.wsService.reconnected$, this.appVisibility.resumed$).pipe(
      map(() => resyncPending()),
    ),
  );

  disconnectWebSocket$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(
          resetTournament,
          disconnectTournamentAdministrator,
          leaveSpectatorPage,
          leaveTrainingSession,
          disconnectTrainingAdministrator,
        ),
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

  // One effect for the three training roles, so that one switchMap replaces the event streams of
  // the previous role. Separate effects each kept their streams: spectator then player of the same
  // session reuse the same public socket, and every event was dispatched twice.
  connectWebSocketTraining$ = createEffect(() =>
    merge(
      // The session admin joins the admin room: `session:updated` arrives there in its full
      // version, participant codes included, so directly applicable to the store.
      this.actions$.pipe(
        ofType(connectTrainingSessionAdministratorSuccess),
        withLatestFrom(this.store.select(selectCurrentTrainingAdminInformations)),
        map(([{ session }, adminInfo]) => ({
          sessionCode: session.code,
          password: adminInfo?.password,
        })),
      ),
      // The player joins the public room, without a password: they receive the same rounds,
      // scores and leaderboards as the admin, but a session view stripped of the personal codes.
      this.actions$.pipe(
        ofType(loadTrainingParticipantCurrentMatchSuccess),
        map(({ sessionCode }) => ({ sessionCode, password: undefined })),
      ),
      // The spectator joins the public room too: the same events as a player.
      this.actions$.pipe(
        ofType(spectateTrainingSession),
        map(({ sessionCode }) => ({ sessionCode, password: undefined })),
      ),
    ).pipe(
      switchMap(({ sessionCode, password }) => {
        if (password) {
          this.wsService.connectTrainingSession(sessionCode, password);
        } else {
          this.wsService.connectTrainingSession(sessionCode);
        }
        return this.computeTrainingWsEvents$();
      }),
    ),
  );

  // Stream separate from the tournament one: `session:updated` and `match:updated` exist on both
  // sides with different payloads, mixing them would read one for the other.
  private computeTrainingWsEvents$() {
    return merge(
      this.wsService
        .on<TrainingSessionAdminDto | TrainingSessionPublicDto>('session:updated')
        .pipe(map((session) => wsTrainingSessionUpdated({ session }))),
      this.wsService
        .on<TrainingRoundDto>('round:generated')
        .pipe(map((round) => wsTrainingRoundGenerated({ round }))),
      this.wsService
        .on<TrainingMatchDto>('match:updated')
        .pipe(map((match) => wsTrainingMatchUpdated({ match }))),
      this.wsService
        .on<TrainingLeaderboardEntryDto[]>('leaderboard:updated')
        .pipe(map((leaderboard) => wsTrainingLeaderboardUpdated({ leaderboard }))),
    );
  }

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
