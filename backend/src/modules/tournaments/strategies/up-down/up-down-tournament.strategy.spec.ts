import { describe, expect, it, vi } from 'vitest';
import { MatchesSession } from 'src/entities/matches-session.entity';
import { TournamentMatch } from 'src/entities/tounament-match.entity';
import { Tournament } from 'src/entities/tournament.entity';
import { MatchStatus } from 'src/enum/status.enum';
import { CompetitionMode, PairingMode, ScoreCalculation } from 'src/enum/tounament.enum';
import { UpDownTournamentStrategy } from './up-down-tournament.strategy';

const TEAM_IDS = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6'];

function team(id: string) {
    return { id, name: id, players: [] };
}

function validated(
    sessionNumber: number,
    a: string,
    b: string,
    scoreA: number,
    scoreB: number,
    plateNumber: number | null = null,
): TournamentMatch {
    return {
        sessionNumber,
        teamA: { id: a },
        teamB: { id: b },
        scoreA,
        scoreB,
        isBye: false,
        byeWin: false,
        plateNumber,
        status: MatchStatus.VALIDATED,
    } as unknown as TournamentMatch;
}

function setup(
    competitionConfiguration: object,
    matches: TournamentMatch[],
    teamIds: string[] = TEAM_IDS,
) {
    const teams = teamIds.map(team);
    const tournament = {
        id: 'tour-1',
        code: 'CODE',
        teams,
        pools: [{ id: 'pool-1', teams }],
        matches,
        configuration: {
            pointsPerGame: 13,
            rematch: false,
            matchAgainstFullSameClub: true,
            matchAgainstPartialSameClub: true,
            scoreCalculation: ScoreCalculation.VICTORY_GOAL_AVERAGE,
            competitionMode: CompetitionMode.UP_DOWN,
            competitionConfiguration,
        },
    } as unknown as Tournament;
    const matchRepo = {
        create: vi.fn((data: object) => data),
        save: vi.fn(async (data: TournamentMatch[]) => data),
    };
    const strategy = new UpDownTournamentStrategy({} as never, matchRepo as never);
    return { strategy, tournament };
}

const session = (sessionNumber: number) =>
    ({ id: `S${sessionNumber}`, sessionNumber }) as MatchesSession;
const options = { byeLoserCap: 6 };

// Round 1: T1 beat T2 (13-5), T3 beat T4 (13-7), T5 beat T6 (13-9). Ranking: T1 T3 T5 T6 T4 T2.
const roundOne = [
    validated(1, 'T1', 'T2', 13, 5),
    validated(1, 'T3', 'T4', 13, 7),
    validated(1, 'T5', 'T6', 13, 9),
];

describe('UpDownTournamentStrategy.generateSessionMatches', () => {
    it('pairs ranking neighbours in a neighbours round, plate 1 for the best ranked team', async () => {
        const { strategy, tournament } = setup(
            { numberOfRound: 4, pairingMode: PairingMode.NEIGHBORS },
            roundOne,
        );

        const matches = await strategy.generateSessionMatches(tournament, session(2), options);

        const byPlate = [...matches].sort((a, b) => a.plateNumber! - b.plateNumber!);
        expect(byPlate.map((m) => [m.teamA.id, m.teamB!.id])).toEqual([
            ['T1', 'T3'],
            // T5 and T6 are neighbours but already met in round 1: T5 takes its next closest.
            ['T5', 'T4'],
            ['T6', 'T2'],
        ]);
        expect(byPlate.map((m) => m.plateNumber)).toEqual([1, 2, 3]);
    });

    it('puts the plates of a random round in ranking order too', async () => {
        const { strategy, tournament } = setup(
            { numberOfRound: 4, pairingMode: PairingMode.RANDOM },
            roundOne,
        );

        const matches = await strategy.generateSessionMatches(tournament, session(2), options);

        const ranking = ['T1', 'T3', 'T5', 'T6', 'T4', 'T2'];
        const bestRank = (m: TournamentMatch) =>
            Math.min(ranking.indexOf(m.teamA.id), ranking.indexOf(m.teamB!.id));
        const byPlate = [...matches].sort((a, b) => a.plateNumber! - b.plateNumber!);
        expect(byPlate.map(bestRank)).toEqual([...byPlate.map(bestRank)].sort((a, b) => a - b));
    });

    it('draws round 1 with the seed: the same tournament gives the same round', async () => {
        const run = async () => {
            const { strategy, tournament } = setup(
                { numberOfRound: 4, pairingMode: PairingMode.DUTCH },
                [],
            );
            const matches = await strategy.generateSessionMatches(tournament, session(1), options);
            return matches.map((m) => `${m.plateNumber}:${m.teamA.id}-${m.teamB?.id}`);
        };
        expect(await run()).toEqual(await run());
    });

    it('scores the bye of an odd round 13-6, as a win', async () => {
        const { strategy, tournament } = setup(
            { numberOfRound: 4, pairingMode: PairingMode.NEIGHBORS },
            [validated(1, 'T1', 'T2', 13, 5), validated(1, 'T3', 'T4', 13, 7)],
            ['T1', 'T2', 'T3', 'T4', 'T5'],
        );

        const matches = await strategy.generateSessionMatches(tournament, session(2), options);

        expect(matches.find((m) => m.isBye)).toMatchObject({
            scoreA: 13,
            scoreB: 6,
            byeWin: true,
            plateNumber: null,
        });
    });

    it('forces the frozen last round to ranking neighbours, ignoring the constraints, bye worth nothing', async () => {
        // T1-T2 already played and rematches are forbidden: the frozen round pairs them anyway.
        const { strategy, tournament } = setup(
            { numberOfRound: 2, lastRoundByRanking: true, pairingMode: PairingMode.RANDOM },
            [
                validated(1, 'T1', 'T2', 13, 5),
                validated(1, 'T3', 'T4', 13, 7),
                validated(1, 'T5', 'T6', 13, 9),
            ],
            ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'],
        );

        const matches = await strategy.generateSessionMatches(tournament, session(2), options);

        const real = matches
            .filter((m) => !m.isBye)
            .sort((a, b) => a.plateNumber! - b.plateNumber!);
        expect(real).toHaveLength(3);
        expect(matches.find((m) => m.isBye)).toMatchObject({ scoreA: 0, scoreB: 0, byeWin: false });
    });
});

describe('UpDownTournamentStrategy.isDrawnSession', () => {
    it('is false for Dutch and neighbour rounds, true for a drawn one', () => {
        const base = { numberOfRound: 5 };
        const dutch = setup({ ...base, pairingMode: PairingMode.DUTCH }, []).strategy;
        const neighbors = setup({ ...base, pairingMode: PairingMode.NEIGHBORS }, []).strategy;
        const random = setup({ ...base, pairingMode: PairingMode.RANDOM }, []).strategy;
        const tournamentOf = (mode: PairingMode) =>
            setup({ ...base, pairingMode: mode }, []).tournament;

        expect(dutch.isDrawnSession(tournamentOf(PairingMode.DUTCH), 2)).toBe(false);
        expect(neighbors.isDrawnSession(tournamentOf(PairingMode.NEIGHBORS), 2)).toBe(false);
        expect(random.isDrawnSession(tournamentOf(PairingMode.RANDOM), 2)).toBe(true);
        expect(neighbors.isDrawnSession(tournamentOf(PairingMode.NEIGHBORS), 1)).toBe(true);
    });
});

describe('UpDownTournamentStrategy.computeStandings', () => {
    const fourTeams = ['T1', 'T2', 'T3', 'T4'];
    const config = { numberOfRound: 2, lastRoundByRanking: true, pairingMode: PairingMode.RANDOM };

    it('ranks by plate once the frozen last round is validated', () => {
        // Round 1: T1 beat T2, T3 beat T4; aggregate after round 1: T1 T3 T4 T2. Last round: plate 1
        // T1-T3 won by T3, plate 2 T4-T2 won by T2.
        const matches = [
            validated(1, 'T1', 'T2', 13, 5),
            validated(1, 'T3', 'T4', 13, 7),
            validated(2, 'T1', 'T3', 6, 13, 1),
            validated(2, 'T4', 'T2', 4, 13, 2),
        ];
        const { strategy, tournament } = setup(config, matches, fourTeams);

        const standings = strategy.computeStandings(tournament, matches);

        expect(standings.map((e) => [e.teamId, e.rank])).toEqual([
            ['T3', 1],
            ['T1', 2],
            ['T2', 3],
            ['T4', 4],
        ]);
    });

    it('keeps the aggregate ranking while the frozen round is not finished', () => {
        const matches = [
            validated(1, 'T1', 'T2', 13, 5),
            validated(1, 'T3', 'T4', 13, 7),
            {
                ...validated(2, 'T1', 'T3', 6, 13, 1),
                status: MatchStatus.PENDING,
            } as TournamentMatch,
        ];
        const { strategy, tournament } = setup(config, matches, fourTeams);

        expect(strategy.computeStandings(tournament, matches).map((e) => e.teamId)).toEqual([
            'T1',
            'T3',
            'T4',
            'T2',
        ]);
    });

    it('keeps the aggregate ranking when the last round is not frozen', () => {
        const matches = [
            validated(1, 'T1', 'T2', 13, 5),
            validated(1, 'T3', 'T4', 13, 7),
            validated(2, 'T1', 'T3', 6, 13, 1),
            validated(2, 'T4', 'T2', 4, 13, 2),
        ];
        const { strategy, tournament } = setup(
            { numberOfRound: 2, pairingMode: PairingMode.RANDOM },
            matches,
            fourTeams,
        );

        const standings = strategy.computeStandings(tournament, matches);

        expect(standings.map((e) => e.rank)).toEqual([1, 2, 3, 4]);
        expect(standings[0].teamId).toBe('T3');
    });
});
