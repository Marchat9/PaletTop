import { ApiCall, ApiCallStatus } from 'src/app/models/api-call.model';
import { Nullable } from 'src/app/models/nullable.model';

export type TrainingSessionStatus = 'OPEN' | 'CLOSED';
export type TrainingRoundStatus = 'OPEN' | 'CLOSED';
export type TrainingTeamKind = 'FIXED' | 'EPHEMERAL';
export type TrainingParticipantStatus = 'PRESENT' | 'LEFT';
export type TrainingMatchStatus = 'PENDING' | 'ONGOING' | 'ENDED' | 'VALIDATED';
/** Au hasard, ou chaque joueur avec un partenaire de niveau voisin. */
export type TrainingTeamComposition = 'RANDOM' | 'LEARNING';

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
  /** Tailles d'équipe utilisables, taille visée comprise. */
  allowedTeamSizes: number[];
  /** Garder la taille visée quitte à mettre des joueurs au repos, ou faire jouer tout le monde. */
  preferTargetTeamSize: boolean;
  /** Matchs simultanés possibles : les équipes en trop attendent le round suivant. */
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
 * Réglages d'une séance à créer. Figés une fois la séance ouverte : le back ne les expose
 * ensuite que dans la vue détaillée, jamais dans le résumé des séances.
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
 * Identité du participant, renvoyée uniquement à celui qui a fourni son propre code : aucun
 * payload public ne porte les codes, c'est donc le seul moyen pour le client de savoir lequel
 * des deux camps du match est le sien.
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
  // Participant tout juste inscrit : son code doit être communiqué de vive voix à l'intéressé,
  // le reducer le déduit par différence pour que la page puisse l'afficher en grand.
  lastCheckedInParticipant: Nullable<TrainingParticipantAdminDto>;
  rounds: ApiCall<TrainingRoundDto[]>;
  currentRound: ApiCall<Nullable<TrainingRoundDto>>;
  leaderboard: ApiCall<TrainingLeaderboardEntryDto[]>;

  participantCurrentMatch: ApiCall<Nullable<TrainingCurrentMatchDto>>;
  participantHistory: ApiCall<TrainingMatchDto[]>;
}
