import { createAction, props } from '@ngrx/store';
import { PlanPreviewBody, TournamentPlan } from 'src/app/models/tournament-plan.model';

/** `requestId` lets the reducer keep only the latest request's result. */
export const previewPlan = createAction(
  '[Tournament Plan] Preview',
  props<{ requestId: string; body: PlanPreviewBody }>(),
);
export const previewPlanSuccess = createAction(
  '[Tournament Plan] Preview Success',
  props<{ requestId: string; plan: TournamentPlan }>(),
);
export const previewPlanFailure = createAction(
  '[Tournament Plan] Preview Failure',
  props<{ requestId: string; error: string }>(),
);
