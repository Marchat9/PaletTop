import { describe, expect, it } from 'vitest';
import { Tournament } from 'src/entities/tournament.entity';
import {
    activeDetail,
    completedDetail,
    draftDetail,
    tournamentCleanupLogLines,
} from './cleanup-log.utils';

interface TournamentFields {
    name?: string;
    code?: string;
    date: Date;
    createdAt?: Date;
    activatedAt?: Date;
    completedAt?: Date;
}

function tournament(fields: TournamentFields): Tournament {
    return fields as unknown as Tournament;
}

describe('tournamentCleanupLogLines', () => {
    it('sums up, then names each tournament with the rule and the date that made it expire', () => {
        const lines = tournamentCleanupLogLines([
            {
                rule: 'Terminé depuis plus de 7 j',
                tournaments: [
                    tournament({
                        name: 'Open de Vertou',
                        code: 'VERTOU24',
                        date: new Date('2026-11-08T08:00:00Z'),
                        completedAt: new Date('2026-11-08T18:00:00Z'),
                    }),
                ],
                detail: completedDetail,
            },
            {
                rule: 'Brouillon de plus de 7 j prévu dans plus de 365 j ou avant sa création',
                tournaments: [
                    tournament({
                        name: 'Test',
                        code: 'ABC',
                        date: new Date('2030-01-01T09:00:00Z'),
                        createdAt: new Date('2026-11-05T10:00:00Z'),
                    }),
                ],
                detail: draftDetail,
            },
            { rule: 'Actif depuis plus de 7 j', tournaments: [], detail: activeDetail },
        ]);

        expect(lines).toEqual([
            'Nettoyage des tournois : 2 tournoi(s) supprimé(s)',
            '  Terminé depuis plus de 7 j · Open de Vertou (VERTOU24) du dim. 08/11/2026, terminé le 08/11/2026',
            '  Brouillon de plus de 7 j prévu dans plus de 365 j ou avant sa création · Test (ABC) prévu le 01/01/2030, créé le 05/11/2026',
        ]);
    });

    it('describes an active tournament by its start', () => {
        expect(
            activeDetail(
                tournament({
                    date: new Date('2026-11-09T08:00:00Z'),
                    activatedAt: new Date('2026-11-09T08:30:00Z'),
                }),
            ),
        ).toBe('du lun. 09/11/2026, démarré le 09/11/2026');
    });

    it('says when there is nothing to delete', () => {
        expect(tournamentCleanupLogLines([])).toEqual([
            'Nettoyage des tournois : rien à supprimer',
        ]);
    });
});
