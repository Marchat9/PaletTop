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
            );
            expect(matches.find((m) => m.isBye)?.teamA?.id).toBe('C');
        }
    });
});
