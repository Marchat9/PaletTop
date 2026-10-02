import { createFeatureSelector, createSelector } from '@ngrx/store';
import { SuperAdminTrainingsState } from './superadmin-trainings.reducer';

export const superAdminTrainingsFeatureKey = 'superAdminTrainings';

export const selectSuperAdminTrainingsState = createFeatureSelector<SuperAdminTrainingsState>(
  superAdminTrainingsFeatureKey,
);

export const selectSuperAdminTrainingsList = createSelector(
  selectSuperAdminTrainingsState,
  (state) => state.list,
);
export const selectSuperAdminTrainingDetail = createSelector(
  selectSuperAdminTrainingsState,
  (state) => state.detail,
);
export const selectSuperAdminTrainingDeleteRequest = createSelector(
  selectSuperAdminTrainingsState,
  (state) => state.deleteRequest,
);
export const selectSuperAdminTrainingPasswordResetRequest = createSelector(
  selectSuperAdminTrainingsState,
  (state) => state.passwordResetRequest,
);
