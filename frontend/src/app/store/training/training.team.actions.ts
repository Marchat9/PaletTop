import { createAction, props } from '@ngrx/store';
import { TrainingSessionAdminDto } from './training.models';

// --------- Create fixed team ---------
export const createTrainingTeam = createAction(
  '[Training] Create Training Team',
  props<{ sessionCode: string; participantIds: string[]; name?: string }>(),
);
export const createTrainingTeamSuccess = createAction(
  '[Training] Create Training Team Success',
  props<{ session: TrainingSessionAdminDto }>(),
);
export const createTrainingTeamFailure = createAction(
  '[Training] Create Training Team Failure',
  props<{ error: string }>(),
);
// -------------------------------------------------------

// --------- Dissolve team ---------
export const dissolveTrainingTeam = createAction(
  '[Training] Dissolve Training Team',
  props<{ sessionCode: string; teamId: string }>(),
);
export const dissolveTrainingTeamSuccess = createAction(
  '[Training] Dissolve Training Team Success',
  props<{ session: TrainingSessionAdminDto }>(),
);
export const dissolveTrainingTeamFailure = createAction(
  '[Training] Dissolve Training Team Failure',
  props<{ error: string }>(),
);
// -------------------------------------------------------
