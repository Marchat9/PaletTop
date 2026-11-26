import { describe, expect, it } from 'vitest';
import { TournamentStatus } from 'src/enum/status.enum';
import { GlobalRankingEntry } from '../../responses/ranking.dto';
import { TournamentMatch } from 'src/entities/tounament-match.entity';
import { PairingMode } from 'src/enum/tounament.enum';
import {
    computeFrozenStandings,
    computePhaseName,
    isDutchRound,
    isNeighborRound,
    isRankingRound,
} from './up-down-session.utils';

describe('isRankingRound', () => {
    it('est vrai uniquement pour la dernière partie quand l’option est cochée', () => {
        const config = { numberOfRound: 5, lastRoundByRanking: true };
        expect(isRankingRound(config, 4)).toBe(false);
        expect(isRankingRound(config, 5)).toBe(true);
    });

    it('est faux quand l’option n’est pas cochée', () => {
        expect(isRankingRound({ numberOfRound: 5, lastRoundByRanking: false }, 5)).toBe(false);
        expect(isRankingRound({ numberOfRound: 5 }, 5)).toBe(false);
    });

    it('est faux sans nombre de parties ou avec une seule partie', () => {
        expect(isRankingRound({ lastRoundByRanking: true }, 1)).toBe(false);
        expect(isRankingRound({ numberOfRound: 1, lastRoundByRanking: true }, 1)).toBe(false);
    });
});

describe('computePhaseName', () => {
    const config = { numberOfRound: 5, lastRoundByRanking: true };

    it('est vide pour un tournoi en brouillon ou annulé', () => {
        expect(computePhaseName(TournamentStatus.DRAFT, 0, config)).toBe('');
        expect(computePhaseName(TournamentStatus.CANCELLED, 2, config)).toBe('');
    });

    it('indique la partie en cours sur le nombre total', () => {
        expect(computePhaseName(TournamentStatus.ACTIVE, 2, config)).toBe('Partie 2/5');
    });

    it('indique la partie en cours sans total quand le nombre de parties est illimité', () => {
        expect(computePhaseName(TournamentStatus.ACTIVE, 3, {})).toBe('Partie 3');
    });

    it('signale la dernière partie figée', () => {
        expect(computePhaseName(TournamentStatus.ACTIVE, 5, config)).toBe(
            'Montée / Descente — Dernière partie figée',
        );
        expect(
            computePhaseName(TournamentStatus.ACTIVE, 5, {
                numberOfRound: 5,
                lastRoundByRanking: false,
            }),
        ).toBe('Partie 5/5');
    });

    it('indique la fin du tournoi', () => {
        expect(computePhaseName(TournamentStatus.COMPLETED, 5, config)).toBe(
            'Montée / Descente terminée',
        );
    });
});

describe('isNeighborRound', () => {
    const neighbors = { numberOfRound: 5, pairingMode: PairingMode.NEIGHBORS };

    it('is true for the rounds after the first one, but not the first', () => {
        expect(isNeighborRound(neighbors, 1)).toBe(false);
        expect(isNeighborRound(neighbors, 2)).toBe(true);
        expect(isNeighborRound(neighbors, 5)).toBe(true);
    });

    it('is false for the frozen last round, whatever the pairing mode', () => {
        expect(isNeighborRound({ ...neighbors, lastRoundByRanking: true }, 5)).toBe(false);
        expect(isNeighborRound({ ...neighbors, lastRoundByRanking: true }, 4)).toBe(true);
    });

    it('is false for the other pairing modes and for a missing mode', () => {
        expect(isNeighborRound({ numberOfRound: 5, pairingMode: PairingMode.DUTCH }, 2)).toBe(
            false,
        );
        expect(isNeighborRound({ numberOfRound: 5, pairingMode: PairingMode.RANDOM }, 2)).toBe(
            false,
        );
        expect(isNeighborRound({ numberOfRound: 5 }, 2)).toBe(false);
    });

    it('works with an unlimited number of rounds', () => {
        expect(isNeighborRound({ pairingMode: PairingMode.NEIGHBORS }, 7)).toBe(true);
        expect(isDutchRound({ pairingMode: PairingMode.NEIGHBORS }, 7)).toBe(false);
    });
});

describe('computeFrozenStandings', () => {
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

    function played(plate: number, a: string, b: string, scoreA: number, scoreB: number) {
        return {
            plateNumber: plate,
            teamA: { id: a },
            teamB: { id: b },
            scoreA,
            scoreB,
            isBye: false,
        } as unknown as TournamentMatch;
    }

    it('ranks by plate: the winner of plate 1 first, its opponent second, and so on, the bye last', () => {
        // Aggregate ranking B A D C E; plate 1 = A beats B, plate 2 = D plays C and C wins.
        const ranking = [entry('B', 1), entry('A', 2), entry('D', 3), entry('C', 4), entry('E', 5)];
        const lastRound = [
            { plateNumber: null, teamA: { id: 'E' }, teamB: null, isBye: true } as never,
            played(2, 'D', 'C', 5, 13),
            played(1, 'B', 'A', 9, 13),
        ];

        const standings = computeFrozenStandings(ranking, lastRound);

        expect(standings.map((e) => [e.teamId, e.rank])).toEqual([
            ['A', 1],
            ['B', 2],
            ['C', 3],
            ['D', 4],
            ['E', 5],
        ]);
    });

    it('keeps the stats of the aggregate ranking', () => {
        const ranking = [{ ...entry('A', 1), wins: 4 }, entry('B', 2)];
        const standings = computeFrozenStandings(ranking, [played(1, 'B', 'A', 13, 4)]);
        expect(standings[0]).toMatchObject({ teamId: 'B', rank: 1, wins: 0 });
        expect(standings[1]).toMatchObject({ teamId: 'A', rank: 2, wins: 4 });
    });

    it('puts a team missing from the last round after the others, in ranking order', () => {
        const ranking = [entry('A', 1), entry('B', 2), entry('C', 3)];
        const standings = computeFrozenStandings(ranking, [played(1, 'B', 'C', 13, 2)]);
        expect(standings.map((e) => e.teamId)).toEqual(['B', 'C', 'A']);
    });
});
