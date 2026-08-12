import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { catchError, forkJoin, map, of, switchMap } from 'rxjs';
import { RankingService } from 'src/app/services/ranking.service';
import { SessionService } from 'src/app/services/session.service';
import { SpectatorService } from 'src/app/services/spectator.service';
import { convertErrorToString } from 'src/app/utils/api-call.utils';
import {
  loadSpectatorTournament,
  loadSpectatorTournamentFailure,
  loadSpectatorTournamentSuccess,
} from './spectator.actions';

@Injectable()
export class SpectatorEffects {
  private readonly actions$ = inject(Actions);
  private readonly spectatorService = inject(SpectatorService);
  private readonly sessionService = inject(SessionService);
  private readonly rankingService = inject(RankingService);

  loadSpectatorTournament$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadSpectatorTournament),
      switchMap(({ tournamentCode }) =>
        forkJoin({
          tournament: this.spectatorService.getTournament(tournamentCode),
          sessions: this.sessionService.getSessions(tournamentCode),
          ranking: this.rankingService.getRanking(tournamentCode),
        }).pipe(
          map(({ tournament, sessions, ranking }) =>
            loadSpectatorTournamentSuccess({ tournament, sessions, ranking }),
          ),
          catchError((error) =>
            of(loadSpectatorTournamentFailure({ error: convertErrorToString(error) })),
          ),
        ),
      ),
    ),
  );
}
