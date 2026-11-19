import { Team } from 'src/entities/team.entity';
import { TournamentMatch } from 'src/entities/tounament-match.entity';
import { MatchStatus } from 'src/enum/status.enum';
import { ScoreCalculation } from 'src/enum/tounament.enum';
import { PoolRankingEntry } from '../responses/score.dto';
import { rankTeams } from './ranking-calculation.utils';

/** Pool ranking: finished matches of the pool (ended or validated), any score calculation. */
export function computeRanking(
    teams: Team[],
    matches: TournamentMatch[],
    scoreCalculation: ScoreCalculation,
): PoolRankingEntry[] {
    const countedStatuses: MatchStatus[] = [MatchStatus.ENDED, MatchStatus.VALIDATED];
    const finished = matches.filter((m) => countedStatuses.includes(m.status));

    return rankTeams(teams, finished, scoreCalculation).map((entry) => ({
        teamId: entry.teamId,
        teamName: entry.teamName,
        wins: entry.wins,
        pointsFor: entry.pointsFor,
        pointsAgainst: entry.pointsAgainst,
        goalAverage: entry.goalAverage,
        buchholz: entry.buchholz,
    }));
}
