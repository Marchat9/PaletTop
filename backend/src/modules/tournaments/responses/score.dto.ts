import { TournamentMatch } from 'src/entities/tounament-match.entity';

export interface ScoreUpdateResult {
    match: TournamentMatch;
    ranking: PoolRankingEntry[];
}

export interface PoolRankingEntry {
    teamId: string;
    teamName: string;
    wins: number;
    pointsFor: number;
    pointsAgainst: number;
    goalAverage: number;
}
