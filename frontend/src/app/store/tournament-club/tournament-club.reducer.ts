import { createReducer, on } from '@ngrx/store';
import { Nullable } from 'src/app/models/nullable.model';
import {
  clearTournamentClubSuggestions,
  searchTournamentClubs,
  searchTournamentClubsFailure,
  searchTournamentClubsSuccess,
} from './tournament-club.actions';

export interface TournamentClubState {
  suggestions: string[];
  lastSearch: string;
  isLoading: boolean;
  error: Nullable<string>;
}

export const initialTournamentClubState: TournamentClubState = {
  suggestions: [],
  lastSearch: '',
  isLoading: false,
  error: null,
};

export const tournamentClubReducer = createReducer(
  initialTournamentClubState,
  on(searchTournamentClubs, (state, { search }) => ({
    ...state,
    lastSearch: search,
    isLoading: true,
    error: null,
  })),
  // A response for an older search must not overwrite the newer one.
  on(searchTournamentClubsSuccess, (state, { search, clubs }) =>
    search !== state.lastSearch
      ? state
      : { ...state, suggestions: clubs, isLoading: false, error: null },
  ),
  on(searchTournamentClubsFailure, (state, { error }) => ({
    ...state,
    isLoading: false,
    error,
  })),
  on(clearTournamentClubSuggestions, () => initialTournamentClubState),
);
