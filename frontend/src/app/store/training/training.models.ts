import { ApiCall, ApiCallStatus } from 'src/app/models/api-call.model';
import { Nullable } from 'src/app/models/nullable.model';

export type TrainingSessionStatus = 'OPEN' | 'CLOSED';
export type TrainingRoundStatus = 'OPEN' | 'CLOSED';
export type TrainingTeamKind = 'FIXED' | 'EPHEMERAL';
export type TrainingParticipantStatus = 'PRESENT' | 'LEFT';
export type TrainingMatchStatus = 'PENDING' | 'ONGOING' | 'ENDED' | 'VALIDATED';
/** At random, or every player with a partner of a nearby level. */
export type TrainingTeamComposition = 'RANDOM' | 'LEARNING';

export interface TrainingMemberDto {
  id: string;
  name: string;
}

export interface AdminTrainingDto {
  id: string;
  code: string;
  name: string;
  description?: string;
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
  /** Team sizes that can be used, target size included. */
  allowedTeamSizes: number[];
  /** Keep the target size even if some players rest, or let everyone play. */
  preferTargetTeamSize: boolean;
  /** Simultaneous matches allowed: extra teams wait for the next round. */
  plateCount: number;
  teamComposition: TrainingTeamComposition;
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
  trainingCode: string;
  participants: TrainingParticipantAdminDto[];
  teams: TrainingTeamDto[];
}

export interface TrainingSessionSummaryDto {
  code: string;
  date: string;
  status: TrainingSessionStatus;
  participantsCount: number;
}

/**
 * Settings of a session to create. Frozen once the session is open: the backend then exposes them
 * only in the detailed view, never in the session summary.
 */
export interface TrainingSessionConfigurationDto {
  date: Date;
  playersPerTeam: number;
  allowedTeamSizes: number[];
  preferTargetTeamSize: boolean;
  plateCount: number;
  teamComposition: TrainingTeamComposition;
  avoidSamePartnerConsecutive: boolean;
  avoidSameOpponentConsecutive: boolean;
  pointsPerGame: number;
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

/**
 * Identity of the participant, returned only to the one who gave their own code: no public payload
 * carries the codes, so it is the only way for the client to know which of the two sides of the
 * match is theirs.
 */
export interface TrainingParticipantIdentityDto {
  id: string;
  name: string;
}

export interface TrainingCurrentMatchDto {
  participant: TrainingParticipantIdentityDto;
  match: Nullable<TrainingMatchDto>;
  roundNumber: Nullable<number>;
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
  // Settings of the last session of the group, read to offer them again on the creation page. Kept
  // out of `currentSession`, which always holds the session being run.
  previousSessionSettings: ApiCall<Nullable<TrainingSessionAdminDto>>;
  // Participant just checked in: their code has to be given to them in person, the reducer derives
  // it by difference so that the page can show it large.
  lastCheckedInParticipant: Nullable<TrainingParticipantAdminDto>;
  rounds: ApiCall<TrainingRoundDto[]>;
  currentRound: ApiCall<Nullable<TrainingRoundDto>>;
  leaderboard: ApiCall<TrainingLeaderboardEntryDto[]>;

  participantCurrentMatch: ApiCall<Nullable<TrainingCurrentMatchDto>>;
  participantHistory: ApiCall<TrainingMatchDto[]>;
}
