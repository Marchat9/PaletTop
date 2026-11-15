import { describe, expect, it } from 'vitest';
import { Tournament } from 'src/entities/tournament.entity';
import { CompetitionMode } from 'src/enum/tounament.enum';
import { ChampionshipTournamentStrategy } from './championship/championship-tournament.strategy';
import { StructuredTournamentStrategy } from './structured/structured-tournament.strategy';
import { UpDownTournamentStrategy } from './up-down/up-down-tournament.strategy';

function tournament(
    competitionMode: CompetitionMode,
    competitionConfiguration: Record<string, unknown>,
): Tournament {
    return {
        configuration: { competitionMode, competitionConfiguration },
    } as unknown as Tournament;
}

describe('TournamentStrategy.isDrawnSession', () => {
    it('standard: only the qualifying rounds are drawn, not the brackets', () => {
        const strategy = new StructuredTournamentStrategy(
            {} as never,
            {} as never,
            {} as never,
            {} as never,
        );
        const standard = tournament(CompetitionMode.STANDARD, { numberOfQualifyingRounds: 3 });

        expect([1, 2, 3, 4, 5].map((n) => strategy.isDrawnSession(standard, n))).toEqual([
            true,
            true,
            true,
            false,
            false,
        ]);
    });

    it('up-down: every round is drawn except the last one paired by ranking', () => {
        const strategy = new UpDownTournamentStrategy({} as never, {} as never);
        const byRanking = tournament(CompetitionMode.UP_DOWN, {
            numberOfRound: 4,
            lastRoundByRanking: true,
        });
        const allDrawn = tournament(CompetitionMode.UP_DOWN, {
            numberOfRound: 4,
            lastRoundByRanking: false,
        });

        expect([1, 2, 3, 4].map((n) => strategy.isDrawnSession(byRanking, n))).toEqual([
            true,
            true,
            true,
            false,
        ]);
        expect(strategy.isDrawnSession(allDrawn, 4)).toBe(true);
    });

    it('championship: the fixed rotation never depends on a result', () => {
        const strategy = new ChampionshipTournamentStrategy({} as never, {} as never, {} as never);
        const championship = tournament(CompetitionMode.CHAMPIONSHIP, {
            homeClub: 'A',
            awayClub: 'B',
        });

        expect(strategy.isDrawnSession(championship, 1)).toBe(true);
        expect(strategy.isDrawnSession(championship, 4)).toBe(true);
    });
});
