import { describe, expect, it } from 'vitest';
import { Team } from 'src/entities/team.entity';
import { TournamentMatch } from 'src/entities/tounament-match.entity';
import { MatchStatus } from 'src/enum/status.enum';
import { ScoreCalculation } from 'src/enum/tounament.enum';
import { computeRanking } from './pool-ranking.utils';

const teams = [{ id: 'A', name: 'A' } as Team];

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
        const [entry] = computeRanking(teams, [bye(13)], ScoreCalculation.VICTORY_AND_GOAL_AVERAGE);
        expect(entry).toMatchObject({ wins: 1, pointsFor: 13 });
    });

    // The up-down ranking round gives the last team a 0-0 bye, which must count for nothing.
    it('ne compte rien pour un bye sans point', () => {
        const [entry] = computeRanking(teams, [bye(0)], ScoreCalculation.VICTORY_AND_GOAL_AVERAGE);
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

describe('computeRanking — somme des scores', () => {
    const pool = ['A', 'B', 'C', 'D'].map((id) => ({ id, name: id }) as Team);

    it('départage au goal average les équipes à somme des scores égale', () => {
        // A, D et C marquent 20 points chacune : le goal average les classe (+11, +6, +3).
        const ranking = computeRanking(
            pool,
            [
                played('A', 13, 'B', 2),
                played('A', 7, 'D', 7),
                played('C', 7, 'D', 13),
                played('C', 13, 'B', 4),
            ],
            ScoreCalculation.SCORE,
        );

        expect(ranking.map((entry) => entry.teamId)).toEqual(['A', 'D', 'C', 'B']);
        expect(ranking[0]).toMatchObject({ pointsFor: 20, goalAverage: 11 });
        expect(ranking[1]).toMatchObject({ pointsFor: 20, goalAverage: 6 });
        expect(ranking[2]).toMatchObject({ pointsFor: 20, goalAverage: 3 });
    });

    it('garde la somme des scores comme critère principal', () => {
        // D marque plus (20 contre 13) malgré un goal average bien moins bon.
        const ranking = computeRanking(
            pool,
            [played('A', 13, 'B', 0), played('D', 20, 'C', 19)],
            ScoreCalculation.SCORE,
        );

        expect(ranking[0].teamId).toBe('D');
    });
});
