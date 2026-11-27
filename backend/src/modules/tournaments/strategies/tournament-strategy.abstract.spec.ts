import { describe, expect, it } from 'vitest';
import { Team } from 'src/entities/team.entity';
import { TournamentMatch } from 'src/entities/tounament-match.entity';
import { Tournament } from 'src/entities/tournament.entity';
import { ScoreCalculation } from 'src/enum/tounament.enum';
import { TournamentStrategy } from './tournament-strategy.abstract';

class TestStrategy extends TournamentStrategy {
    computeTournamentStatus(): never {
        throw new Error('not used');
    }
}

describe('TournamentStrategy.computeGlobalRanking', () => {
    const tournament = {
        id: 't1',
        teams: [
            { id: 'A', name: 'A' },
            { id: 'B', name: 'B' },
        ] as Team[],
        configuration: { scoreCalculation: ScoreCalculation.VICTORY_GOAL_AVERAGE },
    } as Tournament;
    const matches = [
        {
            teamA: { id: 'A' },
            teamB: { id: 'B' },
            scoreA: 13,
            scoreB: 9,
            isBye: false,
            byeWin: false,
            sessionNumber: 1,
        },
    ] as TournamentMatch[];

    it('returns the display fields and the rank only, not the ranking work fields', () => {
        const ranking = new TestStrategy().computeGlobalRanking(tournament, matches);

        expect(ranking.map((entry) => Object.keys(entry).sort())).toEqual(
            ranking.map(() =>
                [
                    'rank',
                    'teamId',
                    'teamName',
                    'wins',
                    'pointsFor',
                    'pointsAgainst',
                    'goalAverage',
                    'matchesPlayed',
                    'tournamentPoints',
                    'losses',
                ].sort(),
            ),
        );
        expect(ranking[0]).toMatchObject({ rank: 1, teamId: 'A', wins: 1, pointsFor: 13 });
    });
});
