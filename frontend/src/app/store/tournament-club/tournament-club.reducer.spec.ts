import { describe, expect, it } from 'vitest';
import {
  clearTournamentClubSuggestions,
  searchTournamentClubs,
  searchTournamentClubsSuccess,
} from './tournament-club.actions';
import { initialTournamentClubState, tournamentClubReducer } from './tournament-club.reducer';

describe('tournamentClubReducer', () => {
  it('stores lastSearch and loading on search', () => {
    const state = tournamentClubReducer(
      initialTournamentClubState,
      searchTournamentClubs({ code: 'ABC', search: 'lai' }),
    );
    expect(state.lastSearch).toBe('lai');
    expect(state.isLoading).toBe(true);
    expect(state.error).toBeNull();
  });

  it('stores suggestions on success', () => {
    const searching = tournamentClubReducer(
      initialTournamentClubState,
      searchTournamentClubs({ code: 'ABC', search: 'lai' }),
    );
    const state = tournamentClubReducer(
      searching,
      searchTournamentClubsSuccess({ search: 'lai', clubs: ['Laiton'] }),
    );
    expect(state.suggestions).toEqual(['Laiton']);
    expect(state.isLoading).toBe(false);
  });

  it('ignores a success whose search is not the last one', () => {
    const searching = tournamentClubReducer(
      initialTournamentClubState,
      searchTournamentClubs({ code: 'ABC', search: 'laiton' }),
    );
    const state = tournamentClubReducer(
      searching,
      searchTournamentClubsSuccess({ search: 'lai', clubs: ['Stale'] }),
    );
    expect(state).toEqual(searching);
  });

  it('clears suggestions', () => {
    const withSuggestions = { ...initialTournamentClubState, suggestions: ['A'], lastSearch: 'a' };
    const state = tournamentClubReducer(withSuggestions, clearTournamentClubSuggestions());
    expect(state.suggestions).toEqual([]);
    expect(state.lastSearch).toBe('');
    expect(state.isLoading).toBe(false);
  });
});
