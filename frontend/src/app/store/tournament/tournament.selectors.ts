import { createFeatureSelector, createSelector } from '@ngrx/store';
import { TournamentState } from './tournament.models';

export const tournamentFeatureKey = 'Tournament';

export const selectTournamentState = createFeatureSelector<TournamentState>(tournamentFeatureKey);

// Select tournament informations
export const selectCurrentTournament = createSelector(
  selectTournamentState,
  (state) => state.tournament,
);
export const selectCurrentTournamentData = createSelector(
  selectTournamentState,
  (state) => state.tournament.data,
);
export const selectCurrentTournamentIsLoading = createSelector(
  selectTournamentState,
  (state) => state.tournament.isLoading,
);
export const selectCurrentTournamentError = createSelector(
  selectTournamentState,
  (state) => state.tournament.error,
);

// Select tournament admin informations
export const selectCurrentTournamentAdminInformations = createSelector(
  selectTournamentState,
  (state) => state.adminInformations,
);

export const selectLastRequestedTournamentCode = createSelector(
  selectTournamentState,
  (state) => state.lastRequestedCode,
);

// ---------- Select about tournament creation -----------
export const selectTournamentCreationIsLoading = createSelector(
  selectTournamentState,
  (state) => state.adminRequest.tournamentCreation.isLoading,
);
export const selectTournamentCreationError = createSelector(
  selectTournamentState,
  (state) => state.adminRequest.tournamentCreation.error,
);
// -------------------------------------------------------------------

// ---------- Select about tournament update configuration -----------
export const selectTournamentUpdateConfigLoading = createSelector(
  selectTournamentState,
  (state) => state.adminRequest.updateConfiguration.isLoading,
);
export const selectTournamentUpdateConfigError = createSelector(
  selectTournamentState,
  (state) => state.adminRequest.updateConfiguration.error,
);
// -------------------------------------------------------------------

// ---------- Select about tournament update Team -----------
export const selectTournamentUpdateTeamLoading = createSelector(
  selectTournamentState,
  (state) => state.adminRequest.updateTeams.isLoading,
);
export const selectTournamentUpdateTeamError = createSelector(
  selectTournamentState,
  (state) => state.adminRequest.updateTeams.error,
);
// -------------------------------------------------------------------

// ---------- Select about update a single team -----------
export const selectTournamentUpdateSingleTeamLoading = createSelector(
  selectTournamentState,
  (state) => state.adminRequest.updateTeam.isLoading,
);
export const selectTournamentUpdateSingleTeamError = createSelector(
  selectTournamentState,
  (state) => state.adminRequest.updateTeam.error,
);
// -------------------------------------------------------------------

// ---------- Select about delete a team -----------
export const selectTournamentDeleteTeamLoading = createSelector(
  selectTournamentState,
  (state) => state.adminRequest.deleteTeam.isLoading,
);
export const selectTournamentDeleteTeamError = createSelector(
  selectTournamentState,
  (state) => state.adminRequest.deleteTeam.error,
);
// -------------------------------------------------------------------

// ---------- Select about start tournament -----------
export const selectStartTournamentLoading = createSelector(
  selectTournamentState,
  (state) => state.adminRequest.startTournament.isLoading,
);
export const selectStartTournamentError = createSelector(
  selectTournamentState,
  (state) => state.adminRequest.startTournament.error,
);
// -------------------------------------------------------------------

// ---------- Select about next session -----------
export const selectNextSessionLoading = createSelector(
  selectTournamentState,
  (state) => state.adminRequest.nextSession.isLoading,
);
export const selectNextSessionError = createSelector(
  selectTournamentState,
  (state) => state.adminRequest.nextSession.error,
);
// -------------------------------------------------------------------

// ---------- Select about complete tournament -----------
export const selectCompleteTournamentLoading = createSelector(
  selectTournamentState,
  (state) => state.adminRequest.completeTournament.isLoading,
);
export const selectCompleteTournamentError = createSelector(
  selectTournamentState,
  (state) => state.adminRequest.completeTournament.error,
);
// -------------------------------------------------------------------
