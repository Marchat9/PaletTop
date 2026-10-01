import { createAction, props } from '@ngrx/store';
import { AdminTrainingDto } from './training.models';

// --------- Training Administrator Connection ---------
export const connectTrainingAdministrator = createAction(
  '[Training] Connect Training Administrator',
  props<{ code: string; password: string }>(),
);
export const connectTrainingAdministratorSuccess = createAction(
  '[Training] Connect Training Administrator Success',
  props<{ training: AdminTrainingDto }>(),
);
export const connectTrainingAdministratorFailure = createAction(
  '[Training] Connect Training Administrator Failure',
  props<{ error: string }>(),
);
// -------------------------------------------------------

// --------- Training Administrator Update informations ---------
export const updateTrainingAdministratorInformations = createAction(
  '[Training] Update Training Administrator Informations',
  props<{ code: string; name?: string; description?: string }>(),
);
export const updateTrainingAdministratorInformationsSuccess = createAction(
  '[Training] Update Training Administrator Informations Success',
  props<{ training: AdminTrainingDto }>(),
);
export const updateTrainingAdministratorInformationsFailure = createAction(
  '[Training] Update Training Administrator Informations Failure',
  props<{ error: string }>(),
);
// -------------------------------------------------------

// --------- Training Administrator Add member ---------
export const addTrainingMember = createAction(
  '[Training] Add Training Member',
  props<{ code: string; name: string }>(),
);
export const addTrainingMemberSuccess = createAction(
  '[Training] Add Training Member Success',
  props<{ training: AdminTrainingDto }>(),
);
export const addTrainingMemberFailure = createAction(
  '[Training] Add Training Member Failure',
  props<{ error: string }>(),
);
// -------------------------------------------------------

// --------- Training Administrator Remove member ---------
export const removeTrainingMember = createAction(
  '[Training] Remove Training Member',
  props<{ code: string; memberId: string }>(),
);
export const removeTrainingMemberSuccess = createAction(
  '[Training] Remove Training Member Success',
  props<{ training: AdminTrainingDto }>(),
);
export const removeTrainingMemberFailure = createAction(
  '[Training] Remove Training Member Failure',
  props<{ error: string }>(),
);
// -------------------------------------------------------
