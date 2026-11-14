import { createAction, props } from '@ngrx/store';

export const searchTournamentClubs = createAction(
  '[TournamentClub] Search',
  props<{ code: string; search: string }>(),
);
export const searchTournamentClubsSuccess = createAction(
  '[TournamentClub] Search Success',
  props<{ search: string; clubs: string[] }>(),
);
export const searchTournamentClubsFailure = createAction(
  '[TournamentClub] Search Failure',
  props<{ error: string }>(),
);
export const clearTournamentClubSuggestions = createAction('[TournamentClub] Clear Suggestions');
