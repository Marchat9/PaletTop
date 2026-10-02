import { createAction, props } from '@ngrx/store';
import {
  SuperAdminTrainingDetailDto,
  SuperAdminTrainingSummaryDto,
} from 'src/app/services/super-admin-training.service';

export type SuperAdminTrainingSortBy =
  'name' | 'code' | 'createdAt' | 'sessionsCount' | 'openSessionsCount';

export interface SuperAdminTrainingSearchCriteria {
  page: number;
  pageSize: number;
  search: string;
  sortBy: SuperAdminTrainingSortBy;
  sortDir: 'ASC' | 'DESC';
}

export const searchSuperAdminTrainings = createAction(
  '[SuperAdminTrainings] Search',
  props<{ criteria: SuperAdminTrainingSearchCriteria }>(),
);
export const searchSuperAdminTrainingsSuccess = createAction(
  '[SuperAdminTrainings] Search Success',
  props<{ items: SuperAdminTrainingSummaryDto[]; total: number }>(),
);
export const searchSuperAdminTrainingsFailure = createAction(
  '[SuperAdminTrainings] Search Failure',
  props<{ error: string }>(),
);

export const loadSuperAdminTrainingDetail = createAction(
  '[SuperAdminTrainings] Load Detail',
  props<{ id: string }>(),
);
export const loadSuperAdminTrainingDetailSuccess = createAction(
  '[SuperAdminTrainings] Load Detail Success',
  props<{ training: SuperAdminTrainingDetailDto }>(),
);
export const loadSuperAdminTrainingDetailFailure = createAction(
  '[SuperAdminTrainings] Load Detail Failure',
  props<{ error: string }>(),
);
export const clearSuperAdminTrainingDetail = createAction('[SuperAdminTrainings] Clear Detail');

export const deleteSuperAdminTrainings = createAction(
  '[SuperAdminTrainings] Delete',
  props<{ ids: string[] }>(),
);
export const deleteSuperAdminTrainingsSuccess = createAction(
  '[SuperAdminTrainings] Delete Success',
);
export const deleteSuperAdminTrainingsFailure = createAction(
  '[SuperAdminTrainings] Delete Failure',
  props<{ error: string }>(),
);

export const resetSuperAdminTrainingPassword = createAction(
  '[SuperAdminTrainings] Reset Password',
  props<{ id: string; newPassword: string }>(),
);
export const resetSuperAdminTrainingPasswordSuccess = createAction(
  '[SuperAdminTrainings] Reset Password Success',
);
export const resetSuperAdminTrainingPasswordFailure = createAction(
  '[SuperAdminTrainings] Reset Password Failure',
  props<{ error: string }>(),
);
