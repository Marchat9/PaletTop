import { Nullable } from './nullable.model';

/**
 * Group key of the bracket a team ended in (structured tournaments), `eliminated_qualifying` for a
 * team stopped after the qualifiers, or `pools` when knocked out before any bracket.
 */
export type RankingSection = string;

export interface GlobalRankingEntry {
  rank: number;
  teamId: string;
  teamName: string;
  wins: number;
  pointsFor: number;
  pointsAgainst: number;
  goalAverage: number;
  matchesPlayed: number;
  tournamentPoints: number;
  /** Matches lost: never a bye, never a draw. */
  losses: number;
  /** Section of the final standings of a structured tournament; absent or null: one ranking. */
  section?: Nullable<RankingSection>;
  /** French label of `section`; null without section or for a team that never reached a bracket. */
  sectionLabel?: Nullable<string>;
}
