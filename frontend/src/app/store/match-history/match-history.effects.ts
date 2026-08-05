import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { catchError, map, of, switchMap } from 'rxjs';
import { MatchHistoryService } from 'src/app/services/match-history.service';
import { convertErrorToString } from 'src/app/utils/api-call.utils';
import { loadTournamentInformationSuccess } from 'src/app/store/tournament/tournament.actions';
import {
  loadMatchHistory,
  loadMatchHistoryFailure,
  loadMatchHistorySuccess,
} from './match-history.actions';

@Injectable()
export class MatchHistoryEffects {
  private readonly actions$ = inject(Actions);
  private readonly matchHistoryService = inject(MatchHistoryService);

  loadMatchHistoryOnPlayerConnect$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadTournamentInformationSuccess),
      map(({ tournament, teamCode }) =>
        loadMatchHistory({ tournamentCode: tournament.code, teamCode }),
      ),
    ),
  );

  loadMatchHistory$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadMatchHistory),
      switchMap(({ tournamentCode, teamCode }) =>
        this.matchHistoryService.getMatchHistory(tournamentCode, teamCode).pipe(
          map((history) => loadMatchHistorySuccess({ history })),
          catchError((error) =>
            of(loadMatchHistoryFailure({ error: convertErrorToString(error) })),
          ),
        ),
      ),
    ),
  );
}
