import { ApiCall, ApiCallStatus } from 'src/app/models/api-call.model';
import { Nullable } from '../../models/nullable.model';
import { TournamentStatus } from 'src/app/models/tournament-status.enum';
import { TournamentConfigurationDetailsDto } from 'src/app/models/tournament-configuration-detail.model';

export interface TournamentStatusInfo {
  currentSession: number;
  phaseName: string;
  canFinishTournament: boolean;
  canGenerateNewSession: boolean;
}

export interface TournamentDto {
  id: string;
  code: string;
  name: string;
  date: Date;
  description?: string;
  configuration: TournamentConfigurationDetailsDto;
  status: TournamentStatus;
  teams: TounamentTeamDto[];
  createdAt: string;
  tournamentStatus: Nullable<TournamentStatusInfo>;
}

export interface TounamentTeamDto {
  id: string;
  code?: string;
  club?: string;
  name: string;
  players: TounamentTeamPlayerDto[];
  matches?: TounamentTeamMatchDto[];
}

export interface TounamentTeamPlayerDto {
  id: string;
  name: string;
  club?: string;
}

export interface TounamentTeamPlayerClubDto {
  id: Nullable<string>;
  name: string;
}

export interface TounamentTeamMatchDto {
  id: string;
  scoreA: number;
  scoreB: number;
  status: string;
  sessionNumber: Nullable<number>;
  teamA: TounamentTeamMatchTeamResumeDto;
  teamB: TounamentTeamMatchTeamResumeDto;
  isBye: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface TounamentTeamMatchTeamResumeDto {
  id: string;
  name: string;
}

export interface TournamentAdminRequest {
  tournamentCreation: ApiCallStatus;
  updateConfiguration: ApiCallStatus;
  updateTeams: ApiCallStatus;
  updateTeam: ApiCallStatus;
  deleteTeam: ApiCallStatus;
  startTournament: ApiCallStatus;
  nextSession: ApiCallStatus;
  completeTournament: ApiCallStatus;
}

export interface TournamentAdminSession {
  code: string;
  password: string;
}

export interface TournamentState {
  tournament: ApiCall<Nullable<TournamentDto>>;
  adminInformations: Nullable<TournamentAdminSession>;
  adminRequest: TournamentAdminRequest;
  lastRequestedCode: Nullable<string>;
}
