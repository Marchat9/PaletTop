import { TounamentTeamPlayerDto } from '../store/tournament/tournament.models';

export enum TeamConfigEventType {
  CREATE_TEAM = 'create-team',
  UPDATE_TEAM = 'update-team',
  REMOVE_TEAM = 'remove-team',
  IMPORT_TEAMS = 'import-teams',
}

export interface TeamConfigCreateTeamPayload {
  name?: string;
  club?: string;
  players: Pick<TounamentTeamPlayerDto, 'name' | 'club'>[];
}

export interface TeamConfigUpdateTeamPayload {
  teamId: string;
  name?: string;
  club?: string;
  players: Pick<TounamentTeamPlayerDto, 'name' | 'club'>[];
}

export interface TeamConfigRemoveTeamPayload {
  teamId: string;
}

export type TeamConfigEvent =
  | { type: TeamConfigEventType.CREATE_TEAM; payload: TeamConfigCreateTeamPayload }
  | { type: TeamConfigEventType.IMPORT_TEAMS; payload: TeamConfigCreateTeamPayload[] }
  | { type: TeamConfigEventType.UPDATE_TEAM; payload: TeamConfigUpdateTeamPayload }
  | { type: TeamConfigEventType.REMOVE_TEAM; payload: TeamConfigRemoveTeamPayload };
