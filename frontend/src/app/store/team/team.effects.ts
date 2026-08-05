import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { catchError, map, of, switchMap } from 'rxjs';
import { TeamService } from 'src/app/services/team.service';
import { convertErrorToString } from 'src/app/utils/api-call.utils';
import { loadTournamentInformationSuccess } from 'src/app/store/tournament/tournament.actions';
import { loadTeam, loadTeamFailure, loadTeamSuccess } from './team.actions';

@Injectable()
export class TeamEffects {
  private readonly actions$ = inject(Actions);
  private readonly teamService = inject(TeamService);

  loadTeamOnPlayerConnect$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadTournamentInformationSuccess),
      map(({ tournament, teamCode }) => loadTeam({ tournamentCode: tournament.code, teamCode })),
    ),
  );

  loadTeam$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadTeam),
      switchMap(({ tournamentCode, teamCode }) =>
        this.teamService.getTeam(tournamentCode, teamCode).pipe(
          map((team) => loadTeamSuccess({ team })),
          catchError((error) => of(loadTeamFailure({ error: convertErrorToString(error) }))),
        ),
      ),
    ),
  );
}
