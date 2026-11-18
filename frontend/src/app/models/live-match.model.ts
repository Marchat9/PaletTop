import { Nullable } from './nullable.model';

/** A match of the round as the spectator screens show it, tournament or training. */
export interface LiveMatchView {
  id: string;
  /** PENDING, ONGOING, ENDED (score entered, awaiting validation) or VALIDATED. */
  status: string;
  isBye: boolean;
  /** A bye worth one win (tournaments): shown as an exempt win. */
  byeWin?: boolean;
  plateNumber: Nullable<number>;
  /** Pool or bracket of a structured tournament (« Tableau principal »...). */
  groupLabel: Nullable<string>;
  teamA: string;
  teamB: Nullable<string>;
  scoreA: number;
  scoreB: number;
}

/**
 * Where the spectator screen stands:
 * - `waiting`: nothing started yet;
 * - `live`: a match of the current round is still to be validated;
 * - `break`: every match of the current round is validated, the next one is not launched;
 * - `finished`: the tournament or the session is over.
 */
export type SpectatorPhase = 'waiting' | 'live' | 'break' | 'finished';
