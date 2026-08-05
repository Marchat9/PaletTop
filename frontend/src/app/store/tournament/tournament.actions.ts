import { createAction, props } from '@ngrx/store';
import { TournamentConfigurationDto } from '../../models/tournament-configuration.model';
import { TournamentDto } from './tournament.models';

// ---------------- Tournament Creation -----------------
export const createTournament = createAction(
  '[Tournament] Create Tournament',
  props<{ configuration: TournamentConfigurationDto }>(),
);
export const createTournamentSuccess = createAction(
  '[Tournament] Create Tournament Success',
  props<{ tournament: TournamentDto; password: string }>(),
);
export const createTournamentFailure = createAction(
  '[Tournament] Create Tournament Failure',
  props<{ error: string }>(),
);
// -------------------------------------------------------

// ----------- Tournament Informations as Player -----------
export const loadTournamentInformation = createAction(
  '[Tournament] Load Tournament Information',
  props<{ tournamentCode: string; teamCode: string }>(),
);
export const loadTournamentInformationSuccess = createAction(
  '[Tournament] Load Tournament Information Success',
  props<{ tournament: TournamentDto; teamCode: string }>(),
);
export const loadTournamentInformationFailure = createAction(
  '[Tournament] Load Tournament Information Failure',
  props<{ error: string }>(),
);
// -------------------------------------------------------

export const resetTournament = createAction('[Tournament] Reset Tournament');
export const disconnectTournamentAdministrator = createAction(
  '[Tournament] Disconnect Tournament Administrator',
);
