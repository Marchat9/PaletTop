import { ApiCall, ApiCallStatus } from 'src/app/models/api-call.model';
import { Nullable } from 'src/app/models/nullable.model';

export type TrainingSessionStatus = 'OPEN' | 'CLOSED';
export type TrainingRoundStatus = 'OPEN' | 'CLOSED';
export type TrainingTeamKind = 'FIXED' | 'EPHEMERAL';
export type TrainingParticipantStatus = 'PRESENT' | 'LEFT';
export type TrainingMatchStatus = 'PENDING' | 'ONGOING' | 'ENDED' | 'VALIDATED';

export interface TrainingMemberDto {
  id: string;
  name: string;
}

export interface AdminTrainingDto {
  id: string;
  code: string;
  name: string;
  club?: string;
  createdAt: string;
  members: TrainingMemberDto[];
}

export interface TrainingParticipantPublicDto {
  id: string;
  name: string;
  status: TrainingParticipantStatus;
}

export interface TrainingParticipantAdminDto extends TrainingParticipantPublicDto {
  code: string;
  memberId?: string;
}

export interface TrainingTeamMemberSummaryDto {
  id: string;
  name: string;
}

export interface TrainingTeamDto {
  id: string;
  kind: TrainingTeamKind;
  name?: string;
  members: TrainingTeamMemberSummaryDto[];
}

interface TrainingSessionFieldsDto {
  id: string;
  code: string;
  date: string;
  status: TrainingSessionStatus;
  playersPerTeam: number;
  fallbackTeamSize: number;
  allowSitOut: boolean;
  avoidSamePartnerConsecutive: boolean;
  avoidSameOpponentConsecutive: boolean;
  pointsPerGame: number;
  closedAt?: string;
  createdAt: string;
}

export interface TrainingSessionPublicDto extends TrainingSessionFieldsDto {
  participants: TrainingParticipantPublicDto[];
  teams: TrainingTeamDto[];
}

export interface TrainingSessionAdminDto extends TrainingSessionFieldsDto {
  participants: TrainingParticipantAdminDto[];
  teams: TrainingTeamDto[];
}

export interface TrainingSessionSummaryDto {
  code: string;
  date: string;
  status: TrainingSessionStatus;
  participantsCount: number;
}

export interface TrainingMatchDto {
  id: string;
  status: TrainingMatchStatus;
  teamA: TrainingTeamDto;
  teamB: TrainingTeamDto | null;
  isBye: boolean;
  scoreA: number;
  scoreB: number;
  startedAt?: string;
  finishedAt?: string;
}

export interface TrainingRoundDto {
  id: string;
  roundNumber: number;
  status: TrainingRoundStatus;
  matches: TrainingMatchDto[];
}

export interface TrainingCurrentMatchDto {
  match: Nullable<TrainingMatchDto>;
  sitOut: boolean;
}

export interface TrainingLeaderboardEntryDto {
  participantId: string;
  name: string;
  wins: number;
  points: number;
}

export interface TrainingAdminSession {
  code: string;
  password: string;
}

export interface TrainingRequestStatus {
  trainingCreation: ApiCallStatus;
  updateTraining: ApiCallStatus;
  addMember: ApiCallStatus;
  removeMember: ApiCallStatus;
  createSession: ApiCallStatus;
  closeSession: ApiCallStatus;
  checkinParticipant: ApiCallStatus;
  removeParticipant: ApiCallStatus;
  createTeam: ApiCallStatus;
  dissolveTeam: ApiCallStatus;
  generateRound: ApiCallStatus;
  startMatch: ApiCallStatus;
  updateScore: ApiCallStatus;
  validateMatch: ApiCallStatus;
  adminUpdateScore: ApiCallStatus;
}

export interface TrainingState {
  training: ApiCall<Nullable<AdminTrainingDto>>;
  adminInformations: Nullable<TrainingAdminSession>;
  requestStatus: TrainingRequestStatus;
  lastRequestedCode: Nullable<string>;

  sessions: ApiCall<TrainingSessionSummaryDto[]>;
  currentSession: ApiCall<Nullable<TrainingSessionAdminDto | TrainingSessionPublicDto>>;
  rounds: ApiCall<TrainingRoundDto[]>;
  currentRound: ApiCall<Nullable<TrainingRoundDto>>;
  leaderboard: ApiCall<TrainingLeaderboardEntryDto[]>;

  participantCurrentMatch: ApiCall<Nullable<TrainingCurrentMatchDto>>;
  participantHistory: ApiCall<TrainingMatchDto[]>;
}
