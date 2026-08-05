import { createAction, props } from '@ngrx/store';
import { TournamentDto } from './tournament.models';
import { TeamConfigCreateTeamPayload } from 'src/app/models/team-config.model';
import { TeamDto } from 'src/app/models/team.model';
import { TournamentConfigurationDto } from 'src/app/models/tournament-configuration.model';

// --------- Tournament Administrator Connection ---------
export const connectTournamentAdministrator = createAction(
  '[Tournament] Connect Tournament Administrator',
  props<{ code: string; password: string }>(),
);
export const connectTournamentAdministratorSuccess = createAction(
  '[Tournament] Connect Tournament Administrator Success',
  props<{ tournament: TournamentDto }>(),
);
export const connectTournamentAdministratorFailure = createAction(
  '[Tournament] Connect Tournament Administrator Failure',
  props<{ error: string }>(),
);
// -------------------------------------------------------

// --------- Tournament Administrator Update configuration ---------
export const updateTournamentAdministratorConfiguration = createAction(
  '[Tournament] Update Tournament Administrator Configuration',
  props<{ idtournament: string; tournament: TournamentConfigurationDto }>(),
);
export const updateTournamentAdministratorConfigurationSuccess = createAction(
  '[Tournament] Update Tournament Administrator Configuration Success',
  props<{ tournament: TournamentDto }>(),
);
export const updateTournamentAdministratorConfigurationFailure = createAction(
  '[Tournament] Update Tournament Administrator Configuration Failure',
  props<{ error: string }>(),
);
// -------------------------------------------------------

// --------- Tournament Administrator Update configuration ---------
export const updateTournamentAdministratorTeam = createAction(
  '[Tournament] Update Tournament Administrator Team',
  props<{ code: string; teams: TeamConfigCreateTeamPayload[] }>(),
);
export const updateTournamentAdministratorTeamSuccess = createAction(
  '[Tournament] Update Tournament Administrator Team Success',
  props<{ tournament: TournamentDto }>(),
);
export const updateTournamentAdministratorTeamFailure = createAction(
  '[Tournament] Update Tournament Administrator Team Failure',
  props<{ error: string }>(),
);
// -------------------------------------------------------

// --------- Tournament Administrator Update a single team ---------
export const updateTournamentAdministratorSingleTeam = createAction(
  '[Tournament] Update Tournament Administrator Single Team',
  props<{
    tournamentCode: string;
    teamCode: string;
    teamId: string;
    teamData: { name?: string; players: TeamConfigCreateTeamPayload['players'] };
  }>(),
);
export const updateTournamentAdministratorSingleTeamSuccess = createAction(
  '[Tournament] Update Tournament Administrator Single Team Success',
  props<{ team: TeamDto }>(),
);
export const updateTournamentAdministratorSingleTeamFailure = createAction(
  '[Tournament] Update Tournament Administrator Single Team Failure',
  props<{ error: string }>(),
);
// -------------------------------------------------------

// --------- Tournament Administrator Remove a team ---------
export const removeTournamentAdministratorTeam = createAction(
  '[Tournament] Remove Tournament Administrator Team',
  props<{ tournamentCode: string; teamCode: string; teamId: string }>(),
);
export const removeTournamentAdministratorTeamSuccess = createAction(
  '[Tournament] Remove Tournament Administrator Team Success',
  props<{ teamId: string }>(),
);
export const removeTournamentAdministratorTeamFailure = createAction(
  '[Tournament] Remove Tournament Administrator Team Failure',
  props<{ error: string }>(),
);
// -------------------------------------------------------
