import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { catchError, map, of, switchMap } from 'rxjs';
import { TournamentPlanService } from 'src/app/services/tournament-plan.service';
import { convertErrorToString } from 'src/app/utils/api-call.utils';
import { previewPlan, previewPlanFailure, previewPlanSuccess } from './tournament-plan.actions';

@Injectable()
export class TournamentPlanEffects {
  private readonly actions$ = inject(Actions);
  private readonly tournamentPlanService = inject(TournamentPlanService);

  /** switchMap: a new request cancels the one in flight (latest wins). */
  previewPlan$ = createEffect(() =>
    this.actions$.pipe(
      ofType(previewPlan),
      switchMap(({ requestId, body }) =>
        this.tournamentPlanService.preview(body).pipe(
          map((plan) => previewPlanSuccess({ requestId, plan })),
          catchError((error) =>
            of(previewPlanFailure({ requestId, error: convertErrorToString(error) })),
          ),
        ),
      ),
    ),
  );
}
