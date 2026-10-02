import { Nullable } from './nullable.model';

export type PlayerMatchStatus = 'PENDING' | 'ONGOING' | 'ENDED' | 'VALIDATED';

/** Look of the card when there is no match: end of event to celebrate, or plain waiting. */
export type PlayerMatchEmptyTone = 'neutral' | 'celebration';

/**
 * A match seen from the player's side, independent of both tournament and training.
 *
 * The two contexts share neither identity (a named team on one side, a player and their partner of
 * the round on the other) nor vocabulary: each page projects its own DTO into this model, and the
 * card no longer has to know where it comes from.
 */
export interface PlayerMatchView {
  id: string;
  status: PlayerMatchStatus;
  isBye: boolean;
  /** Label of my side: team name, or player names when the team has none. */
  myLabel: string;
  opponentLabel: string;
  myScore: number;
  opponentScore: number;
  /**
   * Side A carries the red colour of the palets - the information comes from the match, not from
   * the page.
   */
  iAmTeamA: boolean;
  startedAt: Nullable<string>;
  finishedAt: Nullable<string>;
  /** "Plaque N°3" in a tournament, "Partie 3" in a training session. */
  subtitle: Nullable<string>;
}

/** Texts of the block shown when the player does not play this round. */
export interface PlayerByeCopy {
  title: string;
  message: string;
  /** Gain earned once the bye is validated. Absent when resting earns nothing. */
  awardLabel?: Nullable<string>;
  /** Shown as long as the gain is not earned. */
  pendingLabel?: Nullable<string>;
}

/**
 * Texts of the validation block, the requested code not being of the same kind in both contexts.
 */
export interface PlayerValidationCopy {
  hint: string;
  placeholder: string;
}

/** One line of the player's match history. */
export interface PlayerMatchResult {
  id: string;
  /** "Match 3" in a tournament, "Partie 3" in a training session. */
  label: string;
  status: string;
  myScore: number;
  opponentLabel: string;
  opponentScore: number;
  isBye: boolean;
}

/** One statistic tile shown at the top of a player page. */
export interface PlayerStatTile {
  key: string;
  label: string;
  value: string;
  clickable?: boolean;
}
