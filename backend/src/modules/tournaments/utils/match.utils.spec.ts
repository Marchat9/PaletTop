import { NEUTRAL_BYE_WIN } from './bye.utils';
import { seededRandom } from './seeded-random.utils';
import { describe, expect, it } from 'vitest';
import { MatchesSession } from 'src/entities/matches-session.entity';
import { Team } from 'src/entities/team.entity';
import { TournamentPool } from 'src/entities/tournament-pool.entity';
import { Tournament } from 'src/entities/tournament.entity';
import { MatchStatus } from 'src/enum/status.enum';
import { TournamentMatch } from 'src/entities/tounament-match.entity';
import { ConstraintConfig } from 'src/model/constraint.model';
import { GlobalRankingEntry } from '../responses/ranking.dto';
import {
    generateMatchesByRanking,
    generateMatchesInPool,
    orderFirstRoundMatches,
    orderMatchesByRanking,
    orderTeamsByRanking,
} from './match.utils';

const pool = { id: 'P1' } as TournamentPool;
const tournament = { id: 'TR' } as Tournament;
const session = { id: 'S5', sessionNumber: 5 } as MatchesSession;

function teams(ids: string[]): Team[] {
    return ids.map((id) => ({ id, name: id, code: id }) as Team);
}

function entry(teamId: string, rank: number): GlobalRankingEntry {
    return {
        teamId,
        rank,
        teamName: teamId,
        wins: 0,
        pointsFor: 0,
        pointsAgainst: 0,
        goalAverage: 0,
        matchesPlayed: 0,
        tournamentPoints: 0,
        losses: 0,
    };
}

function ids(list: Team[]): string[] {
    return list.map((team) => team.id);
}

describe('orderTeamsByRanking', () => {
    it('trie les équipes selon leur rang', () => {
        const ranking = [entry('C', 3), entry('A', 1), entry('B', 2)];
        expect(ids(orderTeamsByRanking(teams(['A', 'B', 'C']), ranking))).toEqual(['A', 'B', 'C']);
    });

    it("départage les égalités de rang par l'identifiant de l'équipe", () => {
        const ranking = [entry('A', 1), entry('Z', 2), entry('M', 2), entry('B', 4)];
        expect(ids(orderTeamsByRanking(teams(['Z', 'B', 'M', 'A']), ranking))).toEqual([
            'A',
            'M',
            'Z',
            'B',
        ]);
    });
});

describe('generateMatchesByRanking', () => {
    it('apparie chaque équipe avec son voisin de classement, dans l’ordre du classement', () => {
        const matches = generateMatchesByRanking(
            pool,
            teams(['1', '2', '3', '4']),
            tournament,
            session,
        );

        expect(matches.map((m) => [m.teamA?.id, m.teamB?.id])).toEqual([
            ['1', '2'],
            ['3', '4'],
        ]);
        expect(matches.every((m) => m.isBye === false && m.status === MatchStatus.PENDING)).toBe(
            true,
        );
        expect(matches.every((m) => m.sessionNumber === 5)).toBe(true);
    });

    it('donne un bye sans point à la dernière équipe quand le nombre est impair', () => {
        const matches = generateMatchesByRanking(
            pool,
            teams(['1', '2', '3', '4', '5']),
            tournament,
            session,
        );

        expect(matches.filter((m) => !m.isBye).map((m) => [m.teamA?.id, m.teamB?.id])).toEqual([
            ['1', '2'],
            ['3', '4'],
        ]);
        const bye = matches.find((m) => m.isBye);
        expect(bye).toMatchObject({
            teamA: { id: '5' },
            teamB: null,
            scoreA: 0,
            scoreB: 0,
            byeWin: false,
            status: MatchStatus.VALIDATED,
        });
        // The bye comes last so plates follow the ranking order.
        expect(matches[matches.length - 1]).toBe(bye);
    });
});

describe('generateMatchesInPool', () => {
    const constraintConfig: ConstraintConfig = {
        allowMatchAgainstFullSameClub: true,
        allowMatchAgainstPartialSameClub: true,
        allowRematch: true,
    };
    const tournamentWithConfig = { id: 'TR', configuration: { pointsPerGame: 11 } } as Tournament;

    function pastBye(teamId: string): TournamentMatch {
        return { isBye: true, teamA: { id: teamId }, teamB: null } as unknown as TournamentMatch;
    }

    it("donne le bye à l'équipe qui en a eu le moins", () => {
        const pastMatches = [pastBye('A'), pastBye('B')];

        for (let i = 0; i < 20; i++) {
            const matches = generateMatchesInPool(
                pool,
                teams(['A', 'B', 'C']).map((team) => Object.assign(team, { players: [] })),
                tournamentWithConfig,
                session,
                constraintConfig,
                pastMatches,
                NEUTRAL_BYE_WIN,
                seededRandom('spec'),
            );
            expect(matches.find((m) => m.isBye)?.teamA?.id).toBe('C');
        }
    });

    it('gives the bye to the best ranked team on a tie on the fewest byes when a ranking is given', () => {
        // A has had a bye already; B and C none: C is better ranked than B.
        const ranking = [entry('A', 1), entry('C', 2), entry('B', 3), entry('D', 4)];

        for (let i = 0; i < 20; i++) {
            const matches = generateMatchesInPool(
                pool,
                teams(['A', 'B', 'C']).map((team) => Object.assign(team, { players: [] })),
                tournamentWithConfig,
                session,
                constraintConfig,
                [pastBye('A')],
                NEUTRAL_BYE_WIN,
                seededRandom('spec'),
                ranking,
            );
            expect(matches.find((m) => m.isBye)?.teamA?.id).toBe('C');
        }
    });

    it('stores a neutral bye 0-0 as a win, so it leaves the goal average untouched', () => {
        const matches = generateMatchesInPool(
            pool,
            teams(['A', 'B', 'C']).map((team) => Object.assign(team, { players: [] })),
            tournamentWithConfig,
            session,
            constraintConfig,
            [],
            NEUTRAL_BYE_WIN,
            seededRandom('spec'),
        );
        expect(matches.find((m) => m.isBye)).toMatchObject({
            scoreA: 0,
            scoreB: 0,
            byeWin: true,
            status: MatchStatus.VALIDATED,
        });
    });

    it('stores a scored bye as a win with its own score', () => {
        const matches = generateMatchesInPool(
            pool,
            teams(['A', 'B', 'C', 'D', 'E']).map((team) => Object.assign(team, { players: [] })),
            tournamentWithConfig,
            session,
            constraintConfig,
            [],
            { own: 13, against: 6, isWin: true },
            seededRandom('spec'),
        );
        expect(matches.find((m) => m.isBye)).toMatchObject({
            scoreA: 13,
            scoreB: 6,
            byeWin: true,
            isBye: true,
            status: MatchStatus.VALIDATED,
        });
    });
});

describe('orderMatchesByRanking', () => {
    const match = (a: string, b: string) => ({ teamA: { id: a }, teamB: { id: b }, isBye: false });
    const bye = (a: string) => ({ teamA: { id: a }, teamB: null, isBye: true });
    const ranking = [entry('A', 1), entry('B', 2), entry('C', 3), entry('D', 4), entry('E', 5)];

    it('puts the match of the best ranked team first, byes last', () => {
        const ordered = orderMatchesByRanking(
            [bye('E'), match('D', 'C'), match('B', 'A')] as never,
            ranking,
        );
        expect(ordered.map((m) => [m.teamA?.id, m.teamB?.id ?? null])).toEqual([
            ['B', 'A'],
            ['D', 'C'],
            ['E', null],
        ]);
    });

    it('orders a match by its best ranked team, whichever side it is on', () => {
        const ordered = orderMatchesByRanking([match('E', 'C'), match('D', 'A')] as never, ranking);
        expect(ordered.map((m) => m.teamB?.id)).toEqual(['A', 'C']);
    });

    it('counts a team missing from the ranking as last, without dropping its match', () => {
        const ordered = orderMatchesByRanking([match('X', 'Y'), match('A', 'B')] as never, ranking);
        expect(ordered.map((m) => m.teamA?.id)).toEqual(['A', 'X']);
    });
});

describe('orderFirstRoundMatches', () => {
    const match = (a: string, b: string) => ({ teamA: { id: a }, teamB: { id: b }, isBye: false });
    const bye = (a: string) => ({ teamA: { id: a }, teamB: null, isBye: true });
    const input = [match('A', 'B'), match('C', 'D'), match('E', 'F'), match('G', 'H'), bye('I')];

    it('shuffles the real matches with the seed and keeps the byes last', () => {
        const first = orderFirstRoundMatches(input as never, seededRandom('t1:draw:1:0:plates'));
        const again = orderFirstRoundMatches(input as never, seededRandom('t1:draw:1:0:plates'));
        expect(first).toEqual(again);
        expect(first[first.length - 1].isBye).toBe(true);
        expect(first.map((m) => m.teamA?.id).sort()).toEqual(['A', 'C', 'E', 'G', 'I']);
    });

    it('changes the order from one seed to another', () => {
        const orders = new Set(
            [1, 2, 3, 4, 5, 6].map((session) =>
                orderFirstRoundMatches(input as never, seededRandom(`t1:draw:${session}:0`))
                    .map((m) => m.teamA?.id)
                    .join(),
            ),
        );
        expect(orders.size).toBeGreaterThan(1);
    });
});
