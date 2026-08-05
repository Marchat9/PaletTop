import { Nullable } from 'src/app/models/nullable.model';

export enum MatchGroupKey {
  PRINCIPALE = 'principale',
  THIRD_PLACE_MATCH = 'third_place_match',
  CHALLENGE = 'challenge',
  CONSOLANTE = 'consolante',
  CHALLENGE_CONSOLANTE = 'challenge_consolante',
}

export const MATCH_GROUP_LABELS: Record<MatchGroupKey, string> = {
  [MatchGroupKey.PRINCIPALE]: 'Tableau principal',
  [MatchGroupKey.THIRD_PLACE_MATCH]: 'Petite finale (3eme place)',
  [MatchGroupKey.CHALLENGE]: 'Challenge princial',
  [MatchGroupKey.CONSOLANTE]: 'Consolante',
  [MatchGroupKey.CHALLENGE_CONSOLANTE]: 'Challenge consolante',
};

export interface MatchPoolGroup {
  label: string | null;
  order: number;
  matches: SessionMatchDto[];
}

export interface MatchGroupDto {
  order: number;
  name: MatchGroupKey;
}

export interface MatchesSessionDto {
  id: string;
  sessionNumber: number;
  status: SessionStatus;
  matches: SessionMatchDto[];
}

export enum SessionStatus {
  OPEN = 'OPEN',
  CLOSED = 'CLOSED',
}

export interface SessionMatchDto {
  id: string;
  status: string;
  isBye: boolean;
  scoreA: number;
  scoreB: number;
  plateNumber: Nullable<number>;
  teamA: SessionMatchTeamDto;
  teamB: Nullable<SessionMatchTeamDto>;
  poolNumber: Nullable<number>;
  group: Nullable<MatchGroupDto>;
  startedAt: Nullable<string>;
  finishedAt: Nullable<string>;
  duration: Nullable<number>;
}

export interface SessionMatchTeamDto {
  id: string;
  name: string;
}

export interface PoolRankingEntry {
  teamId: string;
  teamName: string;
  wins: number;
  pointsFor: number;
  pointsAgainst: number;
  goalAverage: number;
}

export interface PoolRanking {
  poolNumber: number;
  entries: PoolRankingEntry[];
}
