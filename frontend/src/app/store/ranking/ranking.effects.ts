import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { catchError, filter, map, of, switchMap, withLatestFrom } from 'rxjs';
import { TournamentStatus } from 'src/app/models/tournament-status.enum';
import { RankingService } from 'src/app/services/ranking.service';
import { convertErrorToString } from 'src/app/utils/api-call.utils';
import { loadTournamentInformationSuccess } from 'src/app/store/tournament/tournament.actions';
import { connectTournamentAdministratorSuccess } from 'src/app/store/tournament/tournament.admin.actions';
import { selectCurrentTournamentAdminInformations } from 'src/app/store/tournament/tournament.selectors';
import { adminUpdateScoreSuccess } from 'src/app/store/match/match.actions';
import {
  nextSessionSuccess,
  startTournamentSuccess,
} from 'src/app/store/tournament/tournament.match.actions';
import { loadRanking, loadRankingFailure, loadRankingSuccess } from './ranking.actions';

@Injectable()
export class RankingEffects {
  private readonly actions$ = inject(Actions);
  private readonly store = inject(Store);
  private readonly rankingService = inject(RankingService);

  loadRankingOnAdminConnect$ = createEffect(() =>
    this.actions$.pipe(
      ofType(connectTournamentAdministratorSuccess),
      filter(({ tournament }) => tournament.status !== TournamentStatus.DRAFT),
      withLatestFrom(this.store.select(selectCurrentTournamentAdminInformations)),
      map(([, adminInfo]) => loadRanking({ code: adminInfo!.code })),
    ),
  );

  // Byes are won as soon as a round is created, and a correction moves the ranking: it is reloaded
  // over HTTP rather than trusting the websocket alone, which may be down.
  loadRankingAfterRoundCreated$ = createEffect(() =>
    this.actions$.pipe(
      ofType(startTournamentSuccess, nextSessionSuccess),
      map(({ tournament }) => loadRanking({ code: tournament.code })),
    ),
  );

  loadRankingAfterAdminCorrection$ = createEffect(() =>
    this.actions$.pipe(
      ofType(adminUpdateScoreSuccess),
      withLatestFrom(this.store.select(selectCurrentTournamentAdminInformations)),
      filter(([, adminInfo]) => !!adminInfo?.code),
      map(([, adminInfo]) => loadRanking({ code: adminInfo!.code })),
    ),
  );

  loadRankingOnPlayerConnect$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadTournamentInformationSuccess),
      filter(({ tournament }) => tournament.status !== TournamentStatus.DRAFT),
      map(({ tournament }) => loadRanking({ code: tournament.code })),
    ),
  );

  loadRanking$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadRanking),
      switchMap(({ code }) =>
        this.rankingService.getRanking(code).pipe(
          map((ranking) => loadRankingSuccess({ ranking })),
          catchError((error) => of(loadRankingFailure({ error: convertErrorToString(error) }))),
        ),
      ),
    ),
  );
}
