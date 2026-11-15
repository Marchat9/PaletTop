import { MatchGroupKey } from './matches-session.model';
import { Nullable } from './nullable.model';

/** Table a team ended in (structured tournaments), or `pools` when knocked out before any table. */
export type RankingSection = MatchGroupKey | 'pools';

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
  /** Section of the final standings of a structured tournament; absent or null: one ranking. */
  section?: Nullable<RankingSection>;
}
