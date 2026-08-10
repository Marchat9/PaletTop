import { createFeatureSelector, createSelector } from '@ngrx/store';
import { SuperAdminClubsState } from './superadmin-clubs.reducer';

export const superAdminClubsFeatureKey = 'superAdminClubs';

export const selectSuperAdminClubsState =
  createFeatureSelector<SuperAdminClubsState>(superAdminClubsFeatureKey);

export const selectSuperAdminClubsList = createSelector(
  selectSuperAdminClubsState,
  (state) => state.list,
);
export const selectSuperAdminClubRenameRequest = createSelector(
  selectSuperAdminClubsState,
  (state) => state.renameRequest,
);
export const selectSuperAdminClubDeleteRequest = createSelector(
  selectSuperAdminClubsState,
  (state) => state.deleteRequest,
);
