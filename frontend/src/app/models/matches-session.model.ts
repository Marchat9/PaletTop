import { Nullable } from 'src/app/models/nullable.model';

export interface MatchPoolGroup {
  label: string | null;
  order: number;
  matches: SessionMatchDto[];
}

export interface MatchGroupDto {
  order: number;
  /** Group key (`principale`, `consolante_2`, `challenge_consolante_1`…). */
  name: string;
  /** French label shown as the group title: it comes from the server. */
  label: string;
}

export interface MatchesSessionDto {
  id: string;
  sessionNumber: number;
  status: SessionStatus;
  /** Random draw or fixed rotation: once closed, the admin may still correct its scores. */
  isDrawnRound: boolean;
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
  /** A bye worth one win (tournaments): shown as an exempt win. */
  byeWin?: boolean;
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
  /** Matches lost: never a bye, never a draw. */
  losses: number;
}

export interface PoolRanking {
  poolNumber: number;
  entries: PoolRankingEntry[];
}
