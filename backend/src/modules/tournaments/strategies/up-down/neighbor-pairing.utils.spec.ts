import { describe, expect, it } from 'vitest';
import { Team } from 'src/entities/team.entity';
import { TournamentMatch } from 'src/entities/tounament-match.entity';
import { ConstraintConfig } from 'src/model/constraint.model';
import { seededRandom } from '../../utils/seeded-random.utils';
import { buildNeighborRound, pairNeighbors } from './neighbor-pairing.utils';

const EVERYTHING_ALLOWED: ConstraintConfig = {
    allowMatchAgainstFullSameClub: true,
    allowMatchAgainstPartialSameClub: true,
    allowRematch: true,
};

const NO_REMATCH: ConstraintConfig = { ...EVERYTHING_ALLOWED, allowRematch: false };

function teams(...ids: string[]): Team[] {
    return ids.map((id) => ({ id, name: id, players: [] }) as unknown as Team);
}

function played(a: string, b: string): TournamentMatch {
    return { teamA: { id: a }, teamB: { id: b }, isBye: false } as TournamentMatch;
}

function pastBye(team: string): TournamentMatch {
    return { teamA: { id: team }, teamB: null, isBye: true } as unknown as TournamentMatch;
}

function ids(pairs: [Team, Team][]): string[][] {
    return pairs.map(([a, b]) => [a.id, b.id]);
}

describe('pairNeighbors', () => {
    const eight = teams('T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8');

    it('pairs 1-2, 3-4... when everything is allowed', () => {
        expect(ids(pairNeighbors(eight, [], EVERYTHING_ALLOWED))).toEqual([
            ['T1', 'T2'],
            ['T3', 'T4'],
            ['T5', 'T6'],
            ['T7', 'T8'],
        ]);
    });

    it('keeps the best ranked teams with their closest valid opponent when a rematch is forbidden', () => {
        expect(ids(pairNeighbors(eight, [played('T1', 'T2')], NO_REMATCH))).toEqual([
            ['T1', 'T3'],
            ['T2', 'T4'],
            ['T5', 'T6'],
            ['T7', 'T8'],
        ]);
    });

    it('falls back to pure neighbours when no constraint can be met', () => {
        const four = teams('T1', 'T2', 'T3', 'T4');
        const everyonePlayedEveryone = [
            played('T1', 'T2'),
            played('T1', 'T3'),
            played('T1', 'T4'),
            played('T2', 'T3'),
            played('T2', 'T4'),
            played('T3', 'T4'),
        ];
        expect(ids(pairNeighbors(four, everyonePlayedEveryone, NO_REMATCH))).toEqual([
            ['T1', 'T2'],
            ['T3', 'T4'],
        ]);
    });

    it('pairs two teams together, and nothing for fewer than two', () => {
        expect(ids(pairNeighbors(teams('T1', 'T2'), [], NO_REMATCH))).toEqual([['T1', 'T2']]);
        expect(pairNeighbors(teams('T1'), [], NO_REMATCH)).toEqual([]);
        expect(pairNeighbors([], [], NO_REMATCH)).toEqual([]);
    });
});

describe('buildNeighborRound', () => {
    const seven = teams('T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7');

    it('draws the bye among the teams with the fewest byes, before pairing the others', () => {
        const result = buildNeighborRound(
            seven,
            [pastBye('T2')],
            EVERYTHING_ALLOWED,
            seededRandom('t1:bye:2:0'),
        );
        expect(result.byeTeam).not.toBeNull();
        expect(result.byeTeam!.id).not.toBe('T2');
        const playing = seven.filter((team) => team.id !== result.byeTeam!.id);
        expect(ids(result.pairs)).toEqual([
            [playing[0].id, playing[1].id],
            [playing[2].id, playing[3].id],
            [playing[4].id, playing[5].id],
        ]);
    });

    it('gives the same bye for the same seed', () => {
        const run = () =>
            buildNeighborRound(seven, [], EVERYTHING_ALLOWED, seededRandom('t1:bye:2:0')).byeTeam
                ?.id;
        expect(run()).toBe(run());
    });

    it('has no bye with an even number of teams', () => {
        const result = buildNeighborRound(
            teams('T1', 'T2', 'T3', 'T4'),
            [],
            EVERYTHING_ALLOWED,
            seededRandom('x'),
        );
        expect(result.byeTeam).toBeNull();
        expect(result.pairs).toHaveLength(2);
    });
});
