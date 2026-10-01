import { describe, expect, it } from 'vitest';
import { TournamentStatus } from 'src/enum/status.enum';
import { computePhaseName, isRankingRound } from './up-down-session.utils';

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

    it('signale la dernière partie au classement', () => {
        expect(computePhaseName(TournamentStatus.ACTIVE, 5, config)).toBe(
            'Montée / Descente — Dernière partie (au classement)',
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
