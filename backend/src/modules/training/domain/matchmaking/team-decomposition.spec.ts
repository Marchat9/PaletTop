import { describe, expect, it } from 'vitest';
import { chooseDecomposition, DecompositionInput } from './team-decomposition';

function input(overrides: Partial<DecompositionInput> = {}): DecompositionInput {
    return {
        soloCount: 8,
        fixedTeamCount: 0,
        playersPerTeam: 2,
        allowedTeamSizes: [],
        preferTargetTeamSize: false,
        plateCount: 99,
        ...overrides,
    };
}

describe('chooseDecomposition', () => {
    it("forme des équipes à la taille visée quand l'effectif tombe juste", () => {
        const result = chooseDecomposition(input({ soloCount: 8 }));

        expect(result).toEqual({ groupSizes: [2, 2, 2, 2], fixedTeamsPlaying: 0, sitOutCount: 0 });
    });

    // Trois équipes de 2, c'est une équipe sans adversaire : deux joueurs attendraient pour rien.
    it('écarte les répartitions en nombre impair d’équipes', () => {
        const result = chooseDecomposition(input({ soloCount: 6 }));

        expect(result?.groupSizes).toEqual([2, 2]);
        expect(result?.sitOutCount).toBe(2);
    });

    it('utilise une taille de repli pour que tout le monde joue', () => {
        const result = chooseDecomposition(input({ soloCount: 6, allowedTeamSizes: [1] }));

        expect(result?.groupSizes).toEqual([2, 2, 1, 1]);
        expect(result?.sitOutCount).toBe(0);
    });

    it('préfère le repos à une taille différente quand l’arbitrage le demande', () => {
        const result = chooseDecomposition(
            input({ soloCount: 6, allowedTeamSizes: [1], preferTargetTeamSize: true }),
        );

        expect(result?.groupSizes).toEqual([2, 2]);
        expect(result?.sitOutCount).toBe(2);
    });

    it('reste au plus près de la taille visée à effectif complet', () => {
        const result = chooseDecomposition(input({ soloCount: 7, allowedTeamSizes: [1, 3] }));

        // 2+2+2+1 fait jouer les sept, et s'écarte moins de 2 que 3+2+1+1.
        expect(result?.groupSizes).toEqual([2, 2, 2, 1]);
        expect(result?.sitOutCount).toBe(0);
    });

    it('ne dépasse jamais le nombre de plaques', () => {
        const result = chooseDecomposition(input({ soloCount: 20, plateCount: 3 }));

        expect(result?.groupSizes).toHaveLength(6);
        expect(result?.sitOutCount).toBe(8);
    });

    it('laisse une équipe fixe de côté quand les plaques manquent', () => {
        const result = chooseDecomposition(
            input({ soloCount: 0, fixedTeamCount: 5, plateCount: 2 }),
        );

        expect(result?.fixedTeamsPlaying).toBe(4);
        expect(result?.groupSizes).toEqual([]);
    });

    it('complète une équipe fixe esseulée avec une équipe éphémère', () => {
        const result = chooseDecomposition(input({ soloCount: 2, fixedTeamCount: 1 }));

        expect(result?.fixedTeamsPlaying).toBe(1);
        expect(result?.groupSizes).toEqual([2]);
    });

    it('renonce quand aucun match n’est possible', () => {
        expect(chooseDecomposition(input({ soloCount: 3 }))).toBeNull();
        expect(chooseDecomposition(input({ soloCount: 1 }))).toBeNull();
        expect(chooseDecomposition(input({ soloCount: 0 }))).toBeNull();
    });

    it('fait jouer trois joueurs dès qu’une équipe de 1 est autorisée', () => {
        const result = chooseDecomposition(input({ soloCount: 3, allowedTeamSizes: [1] }));

        expect(result?.groupSizes).toEqual([2, 1]);
        expect(result?.sitOutCount).toBe(0);
    });

    it('tient un gros effectif sans y passer la journée', () => {
        const started = performance.now();
        const result = chooseDecomposition(
            input({ soloCount: 60, allowedTeamSizes: [1, 2, 3, 4, 5, 6], plateCount: 10 }),
        );
        const elapsed = performance.now() - started;

        expect(result?.groupSizes.length).toBeLessThanOrEqual(20);
        expect(elapsed).toBeLessThan(50);
    });
});
