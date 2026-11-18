import { describe, expect, it } from 'vitest';
import { Team } from 'src/entities/team.entity';
import { TournamentMatch } from 'src/entities/tounament-match.entity';
import { ConstraintConfig } from 'src/model/constraint.model';
import {
    buildScoreGroups,
    generateDutchPairs,
    generateNeighbourPairs,
    selectDutchByeTeam,
} from './dutch-pairing.utils';

const NO_CLUB_CONSTRAINT: ConstraintConfig = {
    allowMatchAgainstFullSameClub: true,
    allowMatchAgainstPartialSameClub: true,
    allowRematch: true,
};

function teams(...ids: string[]): Team[] {
    return ids.map((id) => ({ id, name: id, players: [] }) as unknown as Team);
}

function played(a: string, b: string): TournamentMatch {
    return { teamA: { id: a }, teamB: { id: b }, isBye: false } as TournamentMatch;
}

function bye(team: string): TournamentMatch {
    return { teamA: { id: team }, teamB: null, isBye: true } as unknown as TournamentMatch;
}

function wins(entries: Record<string, number>): Map<string, number> {
    return new Map(Object.entries(entries));
}

function ids(pairs: [Team, Team][]): string[][] {
    return pairs.map(([a, b]) => [a.id, b.id]);
}

describe('buildScoreGroups', () => {
    it('groups teams by wins, most wins first, keeping the ranking order', () => {
        const groups = buildScoreGroups(
            teams('A', 'B', 'C', 'D'),
            wins({ A: 1, B: 0, C: 1, D: 0 }),
        );
        expect(groups.map((group) => group.map((t) => t.id))).toEqual([
            ['A', 'C'],
            ['B', 'D'],
        ]);
    });
});

describe('generateDutchPairs', () => {
    it('round 2 with 8 teams: top half vs bottom half inside each group of 4', () => {
        // Round 1: A-E, B-F, C-G, D-H won by A, B, C, D.
        const ranked = teams('A', 'B', 'C', 'D', 'E', 'F', 'G', 'H');
        const { pairs, byeTeam } = generateDutchPairs(
            ranked,
            wins({ A: 1, B: 1, C: 1, D: 1, E: 0, F: 0, G: 0, H: 0 }),
            [played('A', 'E'), played('B', 'F'), played('C', 'G'), played('D', 'H')],
            NO_CLUB_CONSTRAINT,
        );
        expect(byeTeam).toBeNull();
        expect(ids(pairs)).toEqual([
            ['A', 'C'],
            ['B', 'D'],
            ['E', 'G'],
            ['F', 'H'],
        ]);
    });

    it('a group of 8 with the same wins plays 1v5, 2v6, 3v7, 4v8', () => {
        const ranked = teams('1', '2', '3', '4', '5', '6', '7', '8');
        const { pairs } = generateDutchPairs(
            ranked,
            wins({ 1: 2, 2: 2, 3: 2, 4: 2, 5: 2, 6: 2, 7: 2, 8: 2 }),
            [],
            NO_CLUB_CONSTRAINT,
        );
        expect(ids(pairs)).toEqual([
            ['1', '5'],
            ['2', '6'],
            ['3', '7'],
            ['4', '8'],
        ]);
    });

    it('floats the lowest team of an odd group down to the top of the next group', () => {
        const ranked = teams('A', 'B', 'C', 'D', 'E', 'F');
        const { pairs } = generateDutchPairs(
            ranked,
            wins({ A: 2, B: 2, C: 2, D: 1, E: 1, F: 1 }),
            [],
            NO_CLUB_CONSTRAINT,
        );
        // Group 2 wins: A vs B, C floats down and meets D; then E vs F.
        expect(ids(pairs)).toEqual([
            ['A', 'B'],
            ['C', 'D'],
            ['E', 'F'],
        ]);
    });

    it('takes the next preferred opponent when the Dutch one was already met', () => {
        const ranked = teams('A', 'B', 'C', 'D');
        const { pairs } = generateDutchPairs(
            ranked,
            wins({ A: 1, B: 1, C: 1, D: 1 }),
            [played('A', 'C')],
            NO_CLUB_CONSTRAINT,
        );
        expect(ids(pairs)).toEqual([
            ['A', 'D'],
            ['B', 'C'],
        ]);
    });

    it('allows a rematch rather than failing when no rematch-free pairing exists', () => {
        const { pairs } = generateDutchPairs(
            teams('A', 'B'),
            wins({ A: 1, B: 0 }),
            [played('A', 'B')],
            NO_CLUB_CONSTRAINT,
        );
        expect(ids(pairs)).toEqual([['A', 'B']]);
    });

    it('gives the bye to the lowest-ranked team that never had one', () => {
        const ranked = teams('A', 'B', 'C', 'D', 'E');
        const { pairs, byeTeam } = generateDutchPairs(
            ranked,
            wins({ A: 1, B: 1, C: 0, D: 0, E: 1 }),
            [bye('E')],
            NO_CLUB_CONSTRAINT,
        );
        expect(byeTeam?.id).toBe('D');
        expect(pairs.flat().map((t) => t.id)).not.toContain('D');
    });

    it('is deterministic', () => {
        const ranked = teams('A', 'B', 'C', 'D', 'E', 'F', 'G');
        const winsByTeam = wins({ A: 2, B: 1, C: 1, D: 1, E: 0, F: 0, G: 0 });
        const first = generateDutchPairs(ranked, winsByTeam, [], NO_CLUB_CONSTRAINT);
        const second = generateDutchPairs(ranked, winsByTeam, [], NO_CLUB_CONSTRAINT);
        expect(ids(second.pairs)).toEqual(ids(first.pairs));
        expect(second.byeTeam?.id).toBe(first.byeTeam?.id);
    });

    it('avoids same-club pairs when the tournament forbids them, if possible', () => {
        const clubTeam = (id: string, clubId: string) =>
            ({ id, name: id, players: [{ club: { id: clubId } }] }) as unknown as Team;
        const ranked = [
            clubTeam('A', 'x'),
            clubTeam('B', 'y'),
            clubTeam('C', 'x'),
            clubTeam('D', 'y'),
        ];
        const { pairs } = generateDutchPairs(ranked, wins({ A: 1, B: 1, C: 1, D: 1 }), [], {
            ...NO_CLUB_CONSTRAINT,
            allowMatchAgainstFullSameClub: false,
        });
        // Dutch would be A-C and B-D, both same club: the next bottom-half opponent instead.
        expect(ids(pairs)).toEqual([
            ['A', 'D'],
            ['B', 'C'],
        ]);
    });
});

describe('generateNeighbourPairs', () => {
    it('pairs ranking neighbours, skipping an opponent already met', () => {
        const ranked = teams('A', 'B', 'C', 'D');
        const { pairs, byeTeam } = generateNeighbourPairs(ranked, [played('A', 'B')]);
        expect(byeTeam).toBeNull();
        expect(ids(pairs)).toEqual([
            ['A', 'C'],
            ['B', 'D'],
        ]);
    });

    it('leaves the last-ranked team out with an odd count', () => {
        const { pairs, byeTeam } = generateNeighbourPairs(teams('A', 'B', 'C'), []);
        expect(byeTeam?.id).toBe('C');
        expect(ids(pairs)).toEqual([['A', 'B']]);
    });
});

describe('selectDutchByeTeam', () => {
    it('never gives a second bye while another team has none', () => {
        expect(selectDutchByeTeam(teams('A', 'B', 'C'), [bye('C'), bye('B')])?.id).toBe('A');
        expect(selectDutchByeTeam(teams('A', 'B'), [])).toBeNull();
    });
});
