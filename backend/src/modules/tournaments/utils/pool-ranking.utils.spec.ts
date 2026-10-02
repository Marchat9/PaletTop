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
