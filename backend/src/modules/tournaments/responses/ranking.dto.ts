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
    /**
     * Section of the final standings of a structured tournament, once its tables have started
     * (the 3rd-place match belongs to the principal table). Null or absent: a single ranking.
     */
    section?: RankingSection | null;
    /** French label of `section`; null without section or for teams that never reached a bracket. */
    sectionLabel?: string | null;
}
