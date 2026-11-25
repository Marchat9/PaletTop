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

/**
 * Plan of the simulation (« et si j'ai X équipes ? »): its own stream, so that it never replaces the
 * preview of the form. `requestId` works as for the preview.
 */
export const simulatePlan = createAction(
  '[Tournament Plan] Simulate',
  props<{ requestId: string; body: PlanPreviewBody }>(),
);
export const simulatePlanSuccess = createAction(
  '[Tournament Plan] Simulate Success',
  props<{ requestId: string; plan: TournamentPlan }>(),
);
export const simulatePlanFailure = createAction(
  '[Tournament Plan] Simulate Failure',
  props<{ requestId: string; error: string }>(),
);

/**
 * Plan of the launch check: the saved configuration with the teams registered right now. Its own
 * stream, so that it never replaces the preview of the form nor the simulation.
 */
export const previewLaunchPlan = createAction(
  '[Tournament Plan] Preview Launch',
  props<{ body: PlanPreviewBody }>(),
);
export const previewLaunchPlanSuccess = createAction(
  '[Tournament Plan] Preview Launch Success',
  props<{ plan: TournamentPlan }>(),
);
export const previewLaunchPlanFailure = createAction(
  '[Tournament Plan] Preview Launch Failure',
  props<{ error: string }>(),
);
