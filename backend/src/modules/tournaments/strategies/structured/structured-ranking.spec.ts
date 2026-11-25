import { describe, expect, it } from 'vitest';
import { TournamentMatch } from 'src/entities/tounament-match.entity';
import { Tournament } from 'src/entities/tournament.entity';
import { MatchStatus } from 'src/enum/status.enum';
import { CompetitionMode, ScoreCalculation } from 'src/enum/tounament.enum';
import { bracketKey, challengeKey, THIRD_PLACE_GROUP_KEY } from './plan/structured-plan';
import { StructuredTournamentStrategy } from './structured-tournament.strategy';

const GROUP = {
    PRINCIPALE: bracketKey(0),
    THIRD_PLACE_MATCH: THIRD_PLACE_GROUP_KEY,
    CHALLENGE: challengeKey(0),
    CONSOLANTE: bracketKey(1),
};

const strategy = new StructuredTournamentStrategy(
    {} as never,
    {} as never,
    {} as never,
    {} as never,
);

function tournament(
    teamIds: string[],
    competitionConfiguration: object = { numberOfQualifyingRounds: 0 },
): Tournament {
    return {
        id: 'TR',
        teams: teamIds.map((id) => ({ id, name: id })),
        configuration: {
            competitionMode: CompetitionMode.STANDARD,
            scoreCalculation: ScoreCalculation.VICTORY_POINTS_SCORED,
            // By default no qualifying rounds: every match here is an elimination match.
            competitionConfiguration,
        },
    } as unknown as Tournament;
}

function match(
    pool: string,
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

function scheduled(pool: string, session: number, a: string, b: string): TournamentMatch {
    return { ...match(pool, session, a, 0, b, 0), status: MatchStatus.PENDING } as TournamentMatch;
}

function bye(pool: string, session: number, team: string): TournamentMatch {
    return {
        pool: { name: pool },
        sessionNumber: session,
        teamA: { id: team, name: team },
        teamB: null,
        scoreA: 0,
        scoreB: 0,
        status: MatchStatus.VALIDATED,
        isBye: true,
        byeWin: true,
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
            match(GROUP.PRINCIPALE, 3, 'A', 13, 'B', 7), // final: A beats B
            match(GROUP.THIRD_PLACE_MATCH, 3, 'C', 13, 'D', 7),
            match(GROUP.CHALLENGE, 3, 'E', 13, 'F', 7),
            match(GROUP.CONSOLANTE, 3, 'G', 13, 'H', 7),
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

    // Without a consolante, the quarter-final losers exit in the principal table: they must still
    // rank below the 3rd-place match players (the semi-final losers).
    it('classe la petite finale juste sous la finale, au-dessus des perdants des quarts', () => {
        const teams = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
        const matches = [
            match(GROUP.PRINCIPALE, 1, 'A', 13, 'E', 5), // quarter-finals
            match(GROUP.PRINCIPALE, 1, 'B', 13, 'F', 6),
            match(GROUP.PRINCIPALE, 1, 'C', 13, 'G', 7),
            match(GROUP.PRINCIPALE, 1, 'D', 13, 'H', 8),
            match(GROUP.PRINCIPALE, 2, 'A', 13, 'C', 4), // semi-finals
            match(GROUP.PRINCIPALE, 2, 'B', 13, 'D', 3),
            match(GROUP.PRINCIPALE, 3, 'A', 13, 'B', 9), // final
            match(GROUP.THIRD_PLACE_MATCH, 3, 'D', 13, 'C', 1),
        ];

        expect(order(strategy.computeStandings(tournament(teams), matches))).toEqual([
            'A',
            'B',
            'D',
            'C',
            'H',
            'G',
            'F',
            'E',
        ]);
    });

    // A team knocked out later ranks above one knocked out earlier in the same table.
    it('classe une élimination plus tardive au-dessus dans un même tableau', () => {
        const teams = ['W', 'F', 'S'];
        const matches = [
            match(GROUP.CHALLENGE, 2, 'W', 13, 'S', 7), // S out in the semi
            match(GROUP.CHALLENGE, 3, 'W', 13, 'F', 7), // F out in the final
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
            match(GROUP.CHALLENGE, 2, 'W', 13, 'L5', 5), // L5 scored 5
            match(GROUP.CHALLENGE, 2, 'X', 13, 'L9', 9), // L9 scored 9
            match(GROUP.CHALLENGE, 3, 'W', 13, 'X', 7), // final
        ];

        const standings = order(strategy.computeStandings(tournament(teams), matches));
        // Finalists first (W then X), then the semi losers best-score-first (L9 before L5).
        expect(standings).toEqual(['W', 'X', 'L9', 'L5']);
    });

    // The final standings say which table each team ended in, so the ranking can show sections.
    it('indique le tableau de chacun, la petite finale avec le tableau principal', () => {
        const teams = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'P'];
        const matches = [
            match(GROUP.PRINCIPALE, 3, 'A', 13, 'B', 7),
            match(GROUP.THIRD_PLACE_MATCH, 3, 'C', 13, 'D', 7),
            match(GROUP.CHALLENGE, 3, 'E', 13, 'F', 7),
            match(GROUP.CONSOLANTE, 3, 'G', 13, 'H', 7),
        ];

        const sections = Object.fromEntries(
            strategy
                .computeStandings(tournament(teams), matches)
                .map((entry) => [entry.teamId, entry.section]),
        );

        expect(sections).toEqual({
            A: GROUP.PRINCIPALE,
            B: GROUP.PRINCIPALE,
            C: GROUP.PRINCIPALE,
            D: GROUP.PRINCIPALE,
            E: GROUP.CHALLENGE,
            F: GROUP.CHALLENGE,
            G: GROUP.CONSOLANTE,
            H: GROUP.CONSOLANTE,
            // Never reached a table: knocked out in the pools.
            P: 'pools',
        });
    });

    // Before the elimination phase there is a single ranking: no section at all.
    it('ne donne aucune section tant qu’aucun tableau n’a commencé', () => {
        const standings = strategy.computeStandings(tournament(['A', 'B']), []);

        expect(standings.map((entry) => entry.section)).toEqual([null, null]);
    });

    // As soon as an elimination round starts, its matches tell each team's table: the sections show
    // before any of them is validated, teams of a table kept in their qualifying order.
    it('place chaque équipe dans son tableau dès le lancement du round, avant tout résultat', () => {
        const teams = ['A', 'B', 'C', 'D', 'P'];
        const standings = strategy.computeStandings(tournament(teams), [
            scheduled(GROUP.CONSOLANTE, 1, 'C', 'D'),
            scheduled(GROUP.PRINCIPALE, 1, 'A', 'B'),
        ]);

        expect(order(standings).slice(0, 2).sort()).toEqual(['A', 'B']);
        expect(order(standings).slice(2, 4).sort()).toEqual(['C', 'D']);
        expect(Object.fromEntries(standings.map((entry) => [entry.teamId, entry.section]))).toEqual(
            {
                A: GROUP.PRINCIPALE,
                B: GROUP.PRINCIPALE,
                C: GROUP.CONSOLANTE,
                D: GROUP.CONSOLANTE,
                P: 'pools',
            },
        );
    });

    // A team still playing a round ranks above the teams already knocked out of that table.
    it('classe une équipe encore en lice au-dessus des éliminées de son tableau', () => {
        const standings = strategy.computeStandings(tournament(['W', 'L', 'X', 'Y']), [
            match(GROUP.PRINCIPALE, 1, 'W', 13, 'L', 4),
            scheduled(GROUP.PRINCIPALE, 2, 'W', 'X'),
        ]);

        expect(order(standings).indexOf('W')).toBeLessThan(order(standings).indexOf('L'));
    });

    // An odd bracket gives a bye in its first round: the bye team belongs to that bracket, ranked
    // with the teams still in it, never with the teams knocked out in the pools.
    it('place une équipe exemptée au 1er tour dans son tableau', () => {
        const teams = ['A', 'B', 'C', 'D', 'E', 'P'];
        const during = strategy.computeStandings(tournament(teams), [
            bye(GROUP.PRINCIPALE, 1, 'A'),
            scheduled(GROUP.PRINCIPALE, 1, 'B', 'C'),
            scheduled(GROUP.CONSOLANTE, 1, 'D', 'E'),
        ]);

        expect(order(during).slice(0, 3).sort()).toEqual(['A', 'B', 'C']);
        expect(during.find((e) => e.teamId === 'A')).toMatchObject({
            section: GROUP.PRINCIPALE,
            sectionLabel: 'Principale',
        });

        const after = strategy.computeStandings(tournament(teams), [
            bye(GROUP.PRINCIPALE, 1, 'A'),
            match(GROUP.PRINCIPALE, 1, 'B', 13, 'C', 7),
            match(GROUP.CONSOLANTE, 1, 'D', 13, 'E', 7),
        ]);

        // A and B both go through round 1; C, out in that round, comes after them.
        expect(order(after)).toEqual(['B', 'A', 'C', 'D', 'E', 'P']);
        expect(after.find((e) => e.teamId === 'A')?.section).toBe(GROUP.PRINCIPALE);
    });

    // A team that never reached a table gets a heading of its own, never the previous one.
    it('donne un libellé à la section des équipes hors tableaux', () => {
        const standings = strategy.computeStandings(tournament(['A', 'B', 'P']), [
            match(GROUP.PRINCIPALE, 1, 'A', 13, 'B', 7),
        ]);

        expect(standings.find((e) => e.teamId === 'P')).toMatchObject({
            section: 'pools',
            sectionLabel: 'Hors tableaux',
        });
    });

    // Finished 4-bracket tournament: main, challenge main, A, challenge A, B, challenge B.
    it('ordonne les blocs : principale, challenge, consolante A, son challenge, consolante B', () => {
        const keys = [
            GROUP.PRINCIPALE,
            challengeKey(0),
            bracketKey(1),
            challengeKey(1),
            bracketKey(2),
            challengeKey(2),
        ];
        const teams = keys.flatMap((_, i) => [`W${i}`, `L${i}`]);
        // Listed in reverse so that the order comes from the keys, not from the input.
        const matches = keys.map((key, i) => match(key, 3, `W${i}`, 13, `L${i}`, 7)).reverse();

        const standings = strategy.computeStandings(tournament(teams), matches);

        expect(order(standings)).toEqual(teams);
        expect(standings.map((e) => e.rank)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
        expect([...new Set(standings.map((e) => `${e.section}|${e.sectionLabel}`))]).toEqual([
            'principale|Principale',
            'challenge_principale|Challenge principale',
            'consolante_1|Consolante A',
            'challenge_consolante_1|Challenge consolante A',
            'consolante_2|Consolante B',
            'challenge_consolante_2|Challenge consolante B',
        ]);
    });

    it('rattache la petite finale à la section principale avec son libellé', () => {
        const standings = strategy.computeStandings(tournament(['A', 'B', 'C', 'D']), [
            match(GROUP.PRINCIPALE, 3, 'A', 13, 'B', 7),
            match(GROUP.THIRD_PLACE_MATCH, 3, 'C', 13, 'D', 7),
        ]);

        expect(standings.map((e) => e.sectionLabel)).toEqual(Array(4).fill('Principale'));
    });

    // Teams stopped after the qualifiers: no elimination match, ranked after every bracket team
    // in the order of their qualifying ranking.
    describe('équipes arrêtées après les qualifs', () => {
        const teams = ['A', 'B', 'C', 'D', 'E', 'F'];
        const qualifying = [
            match('pool', 1, 'A', 13, 'E', 3),
            match('pool', 1, 'B', 13, 'F', 2),
            match('pool', 1, 'D', 13, 'C', 12),
        ];
        const config = { numberOfQualifyingRounds: 1, eliminatedAfterQualifying: 2 };

        it('classe les arrêtées après les tableaux, selon leur rang de qualification', () => {
            const standings = strategy.computeStandings(tournament(teams, config), [
                ...qualifying,
                match(GROUP.PRINCIPALE, 2, 'A', 13, 'B', 5),
                match(bracketKey(1), 2, 'D', 13, 'C', 4),
            ]);

            expect(order(standings)).toEqual(['A', 'B', 'D', 'C', 'E', 'F']);
            const byTeam = Object.fromEntries(standings.map((e) => [e.teamId, e]));
            expect(byTeam['E']).toMatchObject({
                rank: 5,
                section: 'eliminated_qualifying',
                sectionLabel: 'Éliminés en qualifs',
            });
            expect(byTeam['F']).toMatchObject({ rank: 6, section: 'eliminated_qualifying' });
            expect(byTeam['D']).toMatchObject({
                section: bracketKey(1),
                sectionLabel: 'Consolante A',
            });
        });

        it('ne les sépare pas tant que le tournoi est en qualifs', () => {
            const standings = strategy.computeStandings(tournament(teams, config), qualifying);

            expect(standings.every((e) => e.section === null && e.sectionLabel === null)).toBe(
                true,
            );
        });
    });
});

describe('StructuredTournamentStrategy.computeTeamStatus', () => {
    const config = { numberOfQualifyingRounds: 1, eliminatedAfterQualifying: 1 };

    it('signale une équipe arrêtée dès que l’élimination a commencé', () => {
        const teams = ['A', 'B', 'C'];
        const qualifying = [match('pool', 1, 'A', 13, 'C', 2), match('pool', 1, 'B', 13, 'C', 5)];
        const started = [...qualifying, scheduled(GROUP.PRINCIPALE, 2, 'A', 'B')];

        expect(strategy.computeTeamStatus(tournament(teams, config), started, 'C')).toEqual({
            eliminatedAfterQualifying: true,
        });
        expect(strategy.computeTeamStatus(tournament(teams, config), started, 'A')).toEqual({
            eliminatedAfterQualifying: false,
        });
        // Still in the qualifiers: nobody is out yet.
        expect(strategy.computeTeamStatus(tournament(teams, config), qualifying, 'C')).toEqual({
            eliminatedAfterQualifying: false,
        });
    });

    it('indique le tableau où une équipe a été repêchée après son 1er tour perdu', () => {
        const teams = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
        const matches = [
            match(GROUP.PRINCIPALE, 2, 'A', 13, 'B', 5),
            match(GROUP.PRINCIPALE, 2, 'C', 13, 'D', 5),
            match(GROUP.PRINCIPALE, 2, 'E', 13, 'F', 5),
            match(bracketKey(1), 2, 'G', 13, 'H', 5),
            scheduled(GROUP.PRINCIPALE, 3, 'A', 'C'),
            scheduled(GROUP.PRINCIPALE, 3, 'E', 'D'), // D lost round 1 and is back: repêchée
            scheduled(challengeKey(0), 3, 'B', 'F'), // challenge entrants are not repêchés
        ];
        const t = tournament(teams, { numberOfQualifyingRounds: 1 });
        const repechedFrom = (id: string): string | undefined =>
            strategy.computeTeamStatus(t, matches, id).repechedFrom;

        expect(repechedFrom('D')).toBe('Principale');
        expect(repechedFrom('B')).toBeUndefined();
        expect(repechedFrom('F')).toBeUndefined();
        expect(repechedFrom('A')).toBeUndefined();
        expect(repechedFrom('H')).toBeUndefined();
    });
});
