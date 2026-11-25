import { describe, expect, it } from 'vitest';
import { Team } from 'src/entities/team.entity';
import { TournamentMatch } from 'src/entities/tounament-match.entity';
import { MatchStatus } from 'src/enum/status.enum';
import { ScoreCalculation } from 'src/enum/tounament.enum';
import { computeRanking as computeRankingOf } from './pool-ranking.utils';

const teams = [{ id: 'A', name: 'A' } as Team];
/** Pool ranking of the tournament used by every test of this file. */ function computeRanking(
    poolTeams: Team[],
    matches: TournamentMatch[],
    scoreCalculation: ScoreCalculation,
) {
    return computeRankingOf(poolTeams, matches, scoreCalculation, 'tournament-1');
}

function bye(scoreA: number): TournamentMatch {
    return {
        teamA: { id: 'A', name: 'A' },
        teamB: null,
        scoreA,
        scoreB: 0,
        isBye: true,
        status: MatchStatus.VALIDATED,
    } as unknown as TournamentMatch;
}

describe('computeRanking — bye', () => {
    it('compte un bye avec des points comme une victoire', () => {
        const [entry] = computeRanking(teams, [bye(13)], ScoreCalculation.VICTORY_GOAL_AVERAGE);
        expect(entry).toMatchObject({ wins: 1, pointsFor: 13 });
    });

    // The up-down ranking round gives the last team a 0-0 bye, which must count for nothing.
    it('ne compte rien pour un bye sans point', () => {
        const [entry] = computeRanking(teams, [bye(0)], ScoreCalculation.VICTORY_GOAL_AVERAGE);
        expect(entry).toMatchObject({ wins: 0, pointsFor: 0 });
    });
});

function played(teamA: string, scoreA: number, teamB: string, scoreB: number): TournamentMatch {
    return {
        teamA: { id: teamA, name: teamA },
        teamB: { id: teamB, name: teamB },
        scoreA,
        scoreB,
        isBye: false,
        status: MatchStatus.VALIDATED,
    } as unknown as TournamentMatch;
}

describe('computeRanking — défaites', () => {
    it('expose le nombre de matchs perdus de chaque équipe', () => {
        const pool = ['A', 'B', 'C'].map((id) => ({ id, name: id }) as Team);
        const ranking = computeRanking(
            pool,
            [played('A', 13, 'B', 4), played('C', 13, 'A', 8), played('B', 11, 'C', 11)],
            ScoreCalculation.VICTORY_GOAL_AVERAGE,
        );

        const lossesByTeam = Object.fromEntries(
            ranking.map((entry) => [entry.teamId, entry.losses]),
        );
        expect(lossesByTeam).toEqual({ A: 1, B: 1, C: 0 });
    });
});

describe('computeRanking — victoires, puis points marqués', () => {
    const pool = ['A', 'B', 'C', 'D'].map((id) => ({ id, name: id }) as Team);

    it('départage aux points encaissés les équipes à victoires et points marqués égaux', () => {
        // A, D et C marquent 20 points chacune : le goal average les classe (+11, +6, +3).
        const ranking = computeRanking(
            pool,
            [
                played('A', 13, 'B', 2),
                played('A', 7, 'D', 7),
                played('C', 7, 'D', 13),
                played('C', 13, 'B', 4),
            ],
            ScoreCalculation.VICTORY_POINTS_SCORED,
        );

        expect(ranking.map((entry) => entry.teamId)).toEqual(['A', 'D', 'C', 'B']);
        expect(ranking[0]).toMatchObject({ pointsFor: 20, goalAverage: 11 });
        expect(ranking[1]).toMatchObject({ pointsFor: 20, goalAverage: 6 });
        expect(ranking[2]).toMatchObject({ pointsFor: 20, goalAverage: 3 });
    });

    it('classe en premier aux points marqués à victoires égales', () => {
        // D marque plus (20 contre 13) malgré un goal average bien moins bon.
        const ranking = computeRanking(
            pool,
            [played('A', 13, 'B', 0), played('D', 20, 'C', 19)],
            ScoreCalculation.VICTORY_POINTS_SCORED,
        );

        expect(ranking[0].teamId).toBe('D');
    });
});
