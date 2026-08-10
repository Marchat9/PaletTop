import { createFeatureSelector, createSelector } from '@ngrx/store';
import { SuperAdminTournamentsState } from './superadmin-tournaments.reducer';

export const superAdminTournamentsFeatureKey = 'superAdminTournaments';

export const selectSuperAdminTournamentsState = createFeatureSelector<SuperAdminTournamentsState>(
  superAdminTournamentsFeatureKey,
);

export const selectSuperAdminTournamentsList = createSelector(
  selectSuperAdminTournamentsState,
  (state) => state.list,
);
export const selectSuperAdminTournamentDetail = createSelector(
  selectSuperAdminTournamentsState,
  (state) => state.detail,
);
export const selectSuperAdminTournamentDeleteRequest = createSelector(
  selectSuperAdminTournamentsState,
  (state) => state.deleteRequest,
);
export const selectSuperAdminTournamentStatusChangeRequest = createSelector(
  selectSuperAdminTournamentsState,
  (state) => state.statusChangeRequest,
);
export const selectSuperAdminTournamentPasswordResetRequest = createSelector(
  selectSuperAdminTournamentsState,
  (state) => state.passwordResetRequest,
);
