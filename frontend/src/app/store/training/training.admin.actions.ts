import { createAction, props } from '@ngrx/store';
import { Nullable } from 'src/app/models/nullable.model';
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

// --------- Training Administrator Rename member ---------
export const renameTrainingMember = createAction(
  '[Training] Rename Training Member',
  props<{ code: string; memberId: string; name: string }>(),
);
export const renameTrainingMemberSuccess = createAction(
  '[Training] Rename Training Member Success',
  props<{ training: AdminTrainingDto }>(),
);
export const renameTrainingMemberFailure = createAction(
  '[Training] Rename Training Member Failure',
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

// --------- Training Administrator Admin player ---------
export const setTrainingAdminMember = createAction(
  '[Training] Set Training Admin Member',
  props<{ code: string; memberId: Nullable<string> }>(),
);
export const setTrainingAdminMemberSuccess = createAction(
  '[Training] Set Training Admin Member Success',
  props<{ training: AdminTrainingDto }>(),
);
export const setTrainingAdminMemberFailure = createAction(
  '[Training] Set Training Admin Member Failure',
  props<{ error: string }>(),
);
// -------------------------------------------------------
