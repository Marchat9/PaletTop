import { TournamentMatch } from 'src/entities/tounament-match.entity';
import { PlayerMatchDto } from './player-match.dto';

/** What a score endpoint returns: never the raw match, whose teams carry their codes. */
export interface ScoreUpdateResult {
    match: PlayerMatchDto;
    ranking: PoolRankingEntry[];
}

/** Internal result, before mapping: the raw match is still needed to reach the team rooms. */
export interface RawScoreUpdateResult {
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
