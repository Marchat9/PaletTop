import { createAction, props } from '@ngrx/store';
import { TournamentDto } from './tournament.models';

// --------- Start Tournament ---------
export const startTournament = createAction('[Tournament] Start Tournament');
export const startTournamentSuccess = createAction(
  '[Tournament] Start Tournament Success',
  props<{ tournament: TournamentDto }>(),
);
export const startTournamentFailure = createAction(
  '[Tournament] Start Tournament Failure',
  props<{ error: string }>(),
);
// ------------------------------------

// --------- Next Session ---------
export const nextSession = createAction('[Tournament] Next Session');
export const nextSessionSuccess = createAction(
  '[Tournament] Next Session Success',
  props<{ tournament: TournamentDto }>(),
);
export const nextSessionFailure = createAction(
  '[Tournament] Next Session Failure',
  props<{ error: string }>(),
);
// ------------------------------------

// --------- Complete Tournament ---------
export const completeTournament = createAction('[Tournament] Complete Tournament');
export const completeTournamentSuccess = createAction(
  '[Tournament] Complete Tournament Success',
  props<{ tournament: TournamentDto }>(),
);
export const completeTournamentFailure = createAction(
  '[Tournament] Complete Tournament Failure',
  props<{ error: string }>(),
);
// ------------------------------------
