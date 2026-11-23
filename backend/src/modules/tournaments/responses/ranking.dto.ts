/** Table a team ended in (structured tournaments), or `pools` when knocked out before any table. */
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
    /** Score Buchholz: sum of the wins of the opponents met (byes excluded). */
    buchholz: number;
    /**
     * Section of the final standings of a structured tournament, once its tables have started
     * (the 3rd-place match belongs to the principal table). Null or absent: a single ranking.
     */
    section?: RankingSection | null;
}
