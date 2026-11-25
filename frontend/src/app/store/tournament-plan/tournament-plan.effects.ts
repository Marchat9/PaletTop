import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { catchError, map, of, switchMap } from 'rxjs';
import { TournamentPlanService } from 'src/app/services/tournament-plan.service';
import { convertErrorToString } from 'src/app/utils/api-call.utils';
import {
  previewPlan,
  previewPlanFailure,
  previewPlanSuccess,
  simulatePlan,
  simulatePlanFailure,
  simulatePlanSuccess,
} from './tournament-plan.actions';

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

  /** Same as the preview, on its own stream: the simulation never cancels the preview. */
  simulatePlan$ = createEffect(() =>
    this.actions$.pipe(
      ofType(simulatePlan),
      switchMap(({ requestId, body }) =>
        this.tournamentPlanService.preview(body).pipe(
          map((plan) => simulatePlanSuccess({ requestId, plan })),
          catchError((error) =>
            of(simulatePlanFailure({ requestId, error: convertErrorToString(error) })),
          ),
        ),
      ),
    ),
  );
}
