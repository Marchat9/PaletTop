import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { catchError, map, of, switchMap, withLatestFrom } from 'rxjs';
import { TournamentClubService } from 'src/app/services/tournament-club.service';
import { selectCurrentTournamentAdminInformations } from 'src/app/store/tournament/tournament.selectors';
import { convertErrorToString } from 'src/app/utils/api-call.utils';
import {
  searchTournamentClubs,
  searchTournamentClubsFailure,
  searchTournamentClubsSuccess,
} from './tournament-club.actions';

@Injectable()
export class TournamentClubEffects {
  private readonly actions$ = inject(Actions);
  private readonly store = inject(Store);
  private readonly clubService = inject(TournamentClubService);

  search$ = createEffect(() =>
    this.actions$.pipe(
      ofType(searchTournamentClubs),
      withLatestFrom(this.store.select(selectCurrentTournamentAdminInformations)),
      switchMap(([{ code, search }, adminInformations]) =>
        this.clubService.searchClubs(code, search, adminInformations?.password ?? '').pipe(
          map((clubs) => searchTournamentClubsSuccess({ search, clubs })),
          catchError((error) =>
            of(searchTournamentClubsFailure({ error: convertErrorToString(error) })),
          ),
        ),
      ),
    ),
  );
}
