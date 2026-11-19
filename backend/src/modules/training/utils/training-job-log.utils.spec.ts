import { describe, expect, it } from 'vitest';
import { TrainingSession } from 'src/entities/training-session.entity';
import { autoCloseLogLines, trainingCleanupLogLines } from './training-job-log.utils';

interface SessionFields {
    code: string;
    training?: { name: string; code: string };
    date: string;
    closedAt?: string;
    lastActivityAt?: string;
    players?: number;
}

function session(fields: SessionFields): TrainingSession {
    return {
        code: fields.code,
        training: fields.training,
        date: new Date(fields.date),
        closedAt: fields.closedAt ? new Date(fields.closedAt) : null,
        lastActivityAt: new Date(fields.lastActivityAt ?? fields.date),
        participants: Array.from({ length: fields.players ?? 0 }, () => ({})),
    } as unknown as TrainingSession;
}

const JEUDI = { name: 'Club du jeudi', code: 'QAUI' };
const LAITON = { name: 'Palet Laiton', code: 'LAITON-2026' };

describe('trainingCleanupLogLines', () => {
    it('sums up, then names each session with its club, dates and why it goes', () => {
        const lines = trainingCleanupLogLines(
            [
                session({
                    code: '4803',
                    training: LAITON,
                    date: '2026-11-01T18:00:00Z',
                    closedAt: '2026-11-02T09:00:00Z',
                }),
                session({
                    code: '564415',
                    training: JEUDI,
                    date: '2026-11-05T18:00:00Z',
                    closedAt: '2026-11-06T09:00:00Z',
                    players: 3,
                }),
                session({
                    code: '425390',
                    training: JEUDI,
                    date: '2026-10-29T18:00:00Z',
                    closedAt: '2026-10-30T09:00:00Z',
                    players: 1,
                }),
            ],
            7,
        );

        expect(lines).toEqual([
            'Nettoyage des séances vides : 3 séance(s) supprimée(s) (clôturées depuis plus de 7 j, sans joueur ou sans round)',
            '  Club du jeudi (QAUI) · séance 425390 du jeu. 29/10/2026, clôturée le 30/10/2026 · 1 joueur, aucun round',
            '  Club du jeudi (QAUI) · séance 564415 du jeu. 05/11/2026, clôturée le 06/11/2026 · 3 joueurs, aucun round',
            '  Palet Laiton (LAITON-2026) · séance 4803 du dim. 01/11/2026, clôturée le 02/11/2026 · aucun joueur',
        ]);
    });

    it('says when there is nothing to delete', () => {
        expect(trainingCleanupLogLines([], 7)).toEqual([
            'Nettoyage des séances vides : rien à supprimer (clôturées depuis plus de 7 j, sans joueur ou sans round)',
        ]);
    });
});

describe('autoCloseLogLines', () => {
    it('sums up, then tells for each idle session whether it was closed or left open', () => {
        const lines = autoCloseLogLines(
            [
                {
                    kind: 'leftOpen',
                    session: session({
                        code: '848422',
                        training: JEUDI,
                        date: '2026-11-19T18:00:00Z',
                        lastActivityAt: '2026-11-18T08:40:00Z',
                    }),
                    roundNumber: 2,
                },
                {
                    kind: 'closedWithRound',
                    session: session({
                        code: '565848',
                        training: JEUDI,
                        date: '2026-11-18T18:00:00Z',
                        lastActivityAt: '2026-11-18T13:02:00Z',
                    }),
                    roundNumber: 3,
                },
                {
                    kind: 'closed',
                    session: session({
                        code: '111111',
                        training: LAITON,
                        date: '2026-11-17T18:00:00Z',
                        lastActivityAt: '2026-11-17T20:00:00Z',
                    }),
                },
            ],
            24,
        );

        expect(lines).toEqual([
            'Clôture des séances inactives depuis plus de 24 h : 2 clôturée(s), 1 laissée(s) ouverte(s)',
            '  Club du jeudi (QAUI) · séance 565848 du mer. 18/11/2026 · dernière activité le 18/11/2026 à 14:02 · clôturée (round 3 clôturé avec elle)',
            '  Club du jeudi (QAUI) · séance 848422 du jeu. 19/11/2026 · dernière activité le 18/11/2026 à 09:40 · laissée ouverte : round 2 avec des matchs non validés',
            '  Palet Laiton (LAITON-2026) · séance 111111 du mar. 17/11/2026 · dernière activité le 17/11/2026 à 21:00 · clôturée',
        ]);
    });

    it('says when no session was idle', () => {
        expect(autoCloseLogLines([], 24)).toEqual([
            'Clôture des séances inactives depuis plus de 24 h : aucune séance à clôturer',
        ]);
    });
});
