import { createAction, props } from '@ngrx/store';
import { LaunchChoice } from 'src/app/models/tournament-plan.model';
import { TournamentDto } from './tournament.models';

// --------- Start Tournament ---------
/** The launch choice is optional: without it the tournament starts as configured. */
export const startTournament = createAction(
  '[Tournament] Start Tournament',
  props<{ launchChoice?: LaunchChoice }>(),
);
export const startTournamentSuccess = createAction(
  '[Tournament] Start Tournament Success',
  props<{ tournament: TournamentDto }>(),
);
/** `teamCountChanged`: the server refused the start (409), the teams moved since the launch check. */
export const startTournamentFailure = createAction(
  '[Tournament] Start Tournament Failure',
  props<{ error: string; teamCountChanged: boolean }>(),
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
