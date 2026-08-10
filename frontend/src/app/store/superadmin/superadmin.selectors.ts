import { createFeatureSelector, createSelector } from '@ngrx/store';
import { SuperAdminState } from './superadmin.reducer';

export const superadminFeatureKey = 'superadmin';

export const selectSuperAdminState = createFeatureSelector<SuperAdminState>(superadminFeatureKey);

export const selectSuperAdminPassword = createSelector(
  selectSuperAdminState,
  (state) => state.authentication.data,
);
export const selectSuperAdminIsLoading = createSelector(
  selectSuperAdminState,
  (state) => state.authentication.isLoading,
);
export const selectSuperAdminError = createSelector(
  selectSuperAdminState,
  (state) => state.authentication.error,
);
