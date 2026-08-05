import { Team } from 'src/entities/team.entity';
import { TournamentMatch } from 'src/entities/tounament-match.entity';
import { MatchStatus } from 'src/enum/status.enum';
import { ScoreCalculation } from 'src/enum/tounament.enum';
import { PoolRankingEntry } from '../responses/score.dto';
import { computeTournamentScorePoints } from './score-calculation.utils';

interface PoolRankingStat extends PoolRankingEntry {
    tournamentPoints: number;
}

export function computeRanking(
    teams: Team[],
    matches: TournamentMatch[],
    scoreCalculation: ScoreCalculation,
): PoolRankingEntry[] {
    const stats = new Map<string, PoolRankingStat>();

    for (const team of teams) {
        stats.set(team.id, {
            teamId: team.id,
            teamName: team.name,
            wins: 0,
            pointsFor: 0,
            pointsAgainst: 0,
            goalAverage: 0,
            tournamentPoints: 0,
        });
    }

    const countedStatuses: MatchStatus[] = [MatchStatus.ENDED, MatchStatus.VALIDATED];
    const relevantMatches = matches.filter((m) => countedStatuses.includes(m.status));

    for (const match of relevantMatches) {
        if (match.isBye) {
            const entry = stats.get(match.teamA.id);
            if (entry) {
                entry.wins++;
                entry.pointsFor += match.scoreA;
                entry.tournamentPoints += computeTournamentScorePoints(true, match.scoreA);
            }
            continue;
        }

        if (!match.teamB) continue;

        const entryA = stats.get(match.teamA.id);
        const entryB = stats.get(match.teamB.id);

        if (entryA) {
            entryA.pointsFor += match.scoreA;
            entryA.pointsAgainst += match.scoreB;
            const wonA = match.scoreA > match.scoreB;
            if (wonA) entryA.wins++;
            entryA.tournamentPoints += computeTournamentScorePoints(wonA, match.scoreA);
        }

        if (entryB) {
            entryB.pointsFor += match.scoreB;
            entryB.pointsAgainst += match.scoreA;
            const wonB = match.scoreB > match.scoreA;
            if (wonB) entryB.wins++;
            entryB.tournamentPoints += computeTournamentScorePoints(wonB, match.scoreB);
        }
    }

    const result = [...stats.values()];
    for (const entry of result) {
        entry.goalAverage = entry.pointsFor - entry.pointsAgainst;
    }

    result.sort((a, b) => {
        if (scoreCalculation === ScoreCalculation.SCORE) {
            return b.pointsFor - a.pointsFor;
        }
        if (scoreCalculation === ScoreCalculation.TOURNAMENT_SCORE) {
            return b.tournamentPoints - a.tournamentPoints;
        }
        if (b.wins !== a.wins) return b.wins - a.wins;
        if (b.pointsFor !== a.pointsFor) return b.pointsFor - a.pointsFor;
        return b.goalAverage - a.goalAverage;
    });

    return result.map(({ tournamentPoints: _tournamentPoints, ...entry }) => entry);
}
