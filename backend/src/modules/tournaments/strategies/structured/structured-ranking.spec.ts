import { describe, expect, it } from 'vitest';
import { TournamentMatch } from 'src/entities/tounament-match.entity';
import { Tournament } from 'src/entities/tournament.entity';
import { MatchStatus } from 'src/enum/status.enum';
import { CompetitionMode, MatchGroupKey, ScoreCalculation } from 'src/enum/tounament.enum';
import { StructuredTournamentStrategy } from './structured-tournament.strategy';

const strategy = new StructuredTournamentStrategy(
    {} as never,
    {} as never,
    {} as never,
    {} as never,
);

function tournament(teamIds: string[]): Tournament {
    return {
        id: 'TR',
        teams: teamIds.map((id) => ({ id, name: id })),
        configuration: {
            competitionMode: CompetitionMode.STANDARD,
            scoreCalculation: ScoreCalculation.SCORE,
            // No qualifying rounds: every match here is an elimination match.
            competitionConfiguration: { numberOfQualifyingRounds: 0 },
        },
    } as unknown as Tournament;
}

function match(
    pool: MatchGroupKey,
    session: number,
    a: string,
    scoreA: number,
    b: string,
    scoreB: number,
): TournamentMatch {
    return {
        pool: { name: pool },
        sessionNumber: session,
        teamA: { id: a, name: a },
        teamB: { id: b, name: b },
        scoreA,
        scoreB,
        status: MatchStatus.VALIDATED,
        isBye: false,
    } as unknown as TournamentMatch;
}

function order(entries: { teamId: string; rank: number }[]): string[] {
    return [...entries].sort((a, b) => a.rank - b.rank).map((e) => e.teamId);
}

describe('StructuredTournamentStrategy.computeStandings', () => {
    // The blocks follow the tables: principal final (1-2), third place (3-4), challenge (5-6),
    // consolante (7-8) - a challenge winner never outranks the runner-up.
    it('classe par tableau : principale, petite finale, challenge, consolante', () => {
        const teams = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
        const matches = [
            match(MatchGroupKey.PRINCIPALE, 3, 'A', 13, 'B', 7), // final: A beats B
            match(MatchGroupKey.THIRD_PLACE_MATCH, 3, 'C', 13, 'D', 7),
            match(MatchGroupKey.CHALLENGE, 3, 'E', 13, 'F', 7),
            match(MatchGroupKey.CONSOLANTE, 3, 'G', 13, 'H', 7),
        ];

        expect(order(strategy.computeStandings(tournament(teams), matches))).toEqual([
            'A',
            'B',
            'C',
            'D',
            'E',
            'F',
            'G',
            'H',
        ]);
    });

    // A team knocked out later ranks above one knocked out earlier in the same table.
    it('classe une élimination plus tardive au-dessus dans un même tableau', () => {
        const teams = ['W', 'F', 'S'];
        const matches = [
            match(MatchGroupKey.CHALLENGE, 2, 'W', 13, 'S', 7), // S out in the semi
            match(MatchGroupKey.CHALLENGE, 3, 'W', 13, 'F', 7), // F out in the final
        ];

        // W wins the challenge, F loses the final (out later), S loses the semi (out earlier).
        expect(order(strategy.computeStandings(tournament(teams), matches))).toEqual([
            'W',
            'F',
            'S',
        ]);
    });

    // Two teams out in the same round are split by the points they scored in the match they lost.
    it('départage deux perdants du même tour par leur score', () => {
        const teams = ['W', 'X', 'L9', 'L5'];
        const matches = [
            match(MatchGroupKey.CHALLENGE, 2, 'W', 13, 'L5', 5), // L5 scored 5
            match(MatchGroupKey.CHALLENGE, 2, 'X', 13, 'L9', 9), // L9 scored 9
            match(MatchGroupKey.CHALLENGE, 3, 'W', 13, 'X', 7), // final
        ];

        const standings = order(strategy.computeStandings(tournament(teams), matches));
        // Finalists first (W then X), then the semi losers best-score-first (L9 before L5).
        expect(standings).toEqual(['W', 'X', 'L9', 'L5']);
    });
});
