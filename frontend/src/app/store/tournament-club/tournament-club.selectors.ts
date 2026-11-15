import { createFeatureSelector, createSelector } from '@ngrx/store';
import { TournamentClubState } from './tournament-club.reducer';

export const tournamentClubFeatureKey = 'tournamentClub';

export const selectTournamentClubState =
  createFeatureSelector<TournamentClubState>(tournamentClubFeatureKey);

export const selectTournamentClubSuggestions = createSelector(
  selectTournamentClubState,
  (state) => state.suggestions,
);
export const selectTournamentClubSearchLoading = createSelector(
  selectTournamentClubState,
  (state) => state.isLoading,
);
