import { Nullable } from './nullable.model';

/** A match of a round as the admin screens show it, tournament or training. */
export interface AdminMatchView {
  id: string;
  /** PENDING, ONGOING, ENDED (score entered, awaiting validation) or VALIDATED. */
  status: string;
  isBye: boolean;
  /** A bye worth one win (tournaments): shown as an exempt win. */
  byeWin?: boolean;
  /** A training player resting this round: worth nothing, shown as a rest. */
  isRest?: boolean;
  /** Plate the match is played on; none for a bye, or a training round drawn before plates. */
  plateNumber: Nullable<number>;
  teamA: string;
  teamB: Nullable<string>;
  scoreA: number;
  scoreB: number;
  startedAt: Nullable<string>;
  finishedAt: Nullable<string>;
}

/** Matches of a pool or bracket (« Poule 2 », « Principale »); no label when there is none. */
export interface AdminMatchGroup {
  label: Nullable<string>;
  matches: AdminMatchView[];
}

/** A closed round, as the rounds history lists it. */
export interface AdminRoundHistory {
  id: string;
  roundNumber: number;
  /** Phase of the round (« Phase qualificative 1/4 », « Quarts de finale »…); none for a training. */
  label: Nullable<string>;
  matchCountLabel: string;
  /** Its scores can still be corrected. */
  editable: boolean;
  groups: AdminMatchGroup[];
}
