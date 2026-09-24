import { describe, expect, it } from 'vitest';
import { TrainingTeamComposition } from 'src/enum/training.enum';
import { DefaultMatchmakingStrategy } from './default-matchmaking.strategy';
import { GenerateRoundInput } from './matchmaking.types';

function baseConfig(
    overrides: Partial<GenerateRoundInput['config']> = {},
): GenerateRoundInput['config'] {
    return {
        playersPerTeam: 2,
        allowedTeamSizes: [],
        preferTargetTeamSize: false,
        plateCount: 99,
        teamComposition: TrainingTeamComposition.RANDOM,
        avoidSamePartnerConsecutive: true,
        avoidSameOpponentConsecutive: true,
        ...overrides,
    };
}

function baseHistory(
    overrides: Partial<GenerateRoundInput['history']> = {},
): GenerateRoundInput['history'] {
    return {
        recentRounds: [],
        sitOutCountByParticipant: {},
        ...overrides,
    };
}

function round(
    partnerPairs: [string, string][] = [],
    opponentCanonicalPairs: [string, string][] = [],
) {
    return { partnerPairs, opponentCanonicalPairs };
}

function solos(count: number): string[] {
    return Array.from({ length: count }, (_, i) => `p${i + 1}`);
}

function input(overrides: Partial<GenerateRoundInput> = {}): GenerateRoundInput {
    return {
        fixedTeams: [],
        soloParticipantIds: solos(8),
        config: baseConfig(),
        history: baseHistory(),
        levelByParticipant: {},
        ...overrides,
    };
}

// Random déterministe (pas de mélange) pour des assertions reproductibles sur l'ordre.
const NO_SHUFFLE = () => 0;

describe('DefaultMatchmakingStrategy', () => {
    it("forme des groupes complets quand l'effectif est un multiple de la taille visée", () => {
        const strategy = new DefaultMatchmakingStrategy(NO_SHUFFLE);
        const plan = strategy.generateRound(input({ soloParticipantIds: solos(4) }));

        expect(plan.ephemeralTeams).toHaveLength(2);
        for (const team of plan.ephemeralTeams) {
            expect(team.participantIds).toHaveLength(2);
        }
        expect(allParticipants(plan)).toEqual(new Set(solos(4)));
    });

    it('met au repos ceux qui se sont le moins reposés jusqu’ici', () => {
        const strategy = new DefaultMatchmakingStrategy(NO_SHUFFLE);
        const plan = strategy.generateRound(
            input({
                soloParticipantIds: solos(6),
                history: baseHistory({ sitOutCountByParticipant: { p1: 2, p2: 2, p3: 1 } }),
            }),
        );

        // p4, p5 et p6 ne se sont jamais reposés : c'est leur tour, et p1/p2 rejouent.
        const resting = restingParticipants(plan);
        expect(resting).toHaveLength(2);
        expect(resting).not.toContain('p1');
        expect(resting).not.toContain('p2');
    });

    it('ne dépasse pas le nombre de plaques et met les autres en attente', () => {
        const strategy = new DefaultMatchmakingStrategy(NO_SHUFFLE);
        const plan = strategy.generateRound(
            input({ soloParticipantIds: solos(12), config: baseConfig({ plateCount: 2 }) }),
        );

        const played = plan.matches.filter((m) => m.opponentRef !== null);
        expect(played).toHaveLength(2);
        expect(restingParticipants(plan)).toHaveLength(4);
    });

    it("n'oppose jamais deux joueurs au repos l'un à l'autre", () => {
        const strategy = new DefaultMatchmakingStrategy(NO_SHUFFLE);
        const plan = strategy.generateRound(
            input({ soloParticipantIds: solos(6), config: baseConfig({ plateCount: 1 }) }),
        );

        const restingRefs = plan.ephemeralTeams
            .filter((t) => t.tempId.startsWith('sit-out'))
            .map((t) => t.tempId);
        for (const ref of restingRefs) {
            const match = plan.matches.find((m) => m.teamRef === ref);
            expect(match?.opponentRef).toBeNull();
        }
    });

    it('utilise une taille de repli plutôt que de laisser des joueurs au banc', () => {
        const strategy = new DefaultMatchmakingStrategy(NO_SHUFFLE);
        const plan = strategy.generateRound(
            input({
                soloParticipantIds: solos(6),
                config: baseConfig({ allowedTeamSizes: [1] }),
            }),
        );

        expect(plan.ephemeralTeams.map((t) => t.participantIds.length).sort()).toEqual([
            1, 1, 2, 2,
        ]);
        expect(restingParticipants(plan)).toHaveLength(0);
    });

    it('garde la taille visée quand l’arbitrage le demande', () => {
        const strategy = new DefaultMatchmakingStrategy(NO_SHUFFLE);
        const plan = strategy.generateRound(
            input({
                soloParticipantIds: solos(6),
                config: baseConfig({ allowedTeamSizes: [1], preferTargetTeamSize: true }),
            }),
        );

        const playingSizes = plan.ephemeralTeams
            .filter((t) => !t.tempId.startsWith('sit-out'))
            .map((t) => t.participantIds.length);
        expect(playingSizes).toEqual([2, 2]);
        expect(restingParticipants(plan)).toHaveLength(2);
    });

    it('associe chaque joueur à un partenaire de niveau voisin en apprentissage', () => {
        const strategy = new DefaultMatchmakingStrategy(NO_SHUFFLE);
        const plan = strategy.generateRound(
            input({
                soloParticipantIds: solos(8),
                config: baseConfig({ teamComposition: TrainingTeamComposition.LEARNING }),
                levelByParticipant: {
                    p1: 80,
                    p2: 70,
                    p3: 60,
                    p4: 50,
                    p5: 40,
                    p6: 30,
                    p7: 20,
                    p8: 10,
                },
            }),
        );

        // Moitié haute p1-p4, moitié basse p5-p8 : le meilleur joue avec le meilleur des moins bons.
        const teams = plan.ephemeralTeams.map((t) => t.participantIds.sort().join('+')).sort();
        expect(teams).toEqual(['p1+p5', 'p2+p6', 'p3+p7', 'p4+p8']);
    });

    it('oppose les équipes de force voisine en apprentissage', () => {
        const strategy = new DefaultMatchmakingStrategy(NO_SHUFFLE);
        const plan = strategy.generateRound(
            input({
                soloParticipantIds: solos(8),
                config: baseConfig({ teamComposition: TrainingTeamComposition.LEARNING }),
                levelByParticipant: {
                    p1: 80,
                    p2: 70,
                    p3: 60,
                    p4: 50,
                    p5: 40,
                    p6: 30,
                    p7: 20,
                    p8: 10,
                },
            }),
        );

        const byRef = new Map(
            plan.ephemeralTeams.map((t) => [t.tempId, t.participantIds.sort().join('+')]),
        );
        const oppositions = plan.matches
            .filter((m) => m.opponentRef)
            .map((m) => [byRef.get(m.teamRef), byRef.get(m.opponentRef!)].sort().join(' vs '))
            .sort();
        expect(oppositions).toEqual(['p1+p5 vs p2+p6', 'p3+p7 vs p4+p8']);
    });

    it('place le joueur sans niveau connu vers le bas du classement, sans le mettre dernier', () => {
        const strategy = new DefaultMatchmakingStrategy(NO_SHUFFLE);
        const plan = strategy.generateRound(
            input({
                soloParticipantIds: solos(8),
                config: baseConfig({ teamComposition: TrainingTeamComposition.LEARNING }),
                // p8 est un invité : aucun match joué, donc aucun niveau.
                levelByParticipant: { p1: 80, p2: 70, p3: 60, p4: 50, p5: 40, p6: 30, p7: 20 },
            }),
        );

        const guestTeam = plan.ephemeralTeams.find((t) => t.participantIds.includes('p8'));
        expect(guestTeam?.participantIds).not.toContain('p1');
        expect(guestTeam?.participantIds).toContain('p3');
    });

    it('ne forme aucune équipe éphémère quand tous les participants sont en équipe fixe', () => {
        const strategy = new DefaultMatchmakingStrategy(NO_SHUFFLE);
        const plan = strategy.generateRound(
            input({
                fixedTeams: [
                    { id: 'fixed-1', participantIds: ['a1', 'a2'] },
                    { id: 'fixed-2', participantIds: ['b1', 'b2'] },
                ],
                soloParticipantIds: [],
            }),
        );

        expect(plan.ephemeralTeams).toEqual([]);
        expect(plan.matches).toHaveLength(1);
        expect(
            new Set(
                plan.matches.map((m) => m.teamRef).concat(plan.matches.map((m) => m.opponentRef!)),
            ),
        ).toEqual(new Set(['fixed-1', 'fixed-2']));
    });

    it('complète une équipe fixe esseulée plutôt que de la laisser sans adversaire', () => {
        const strategy = new DefaultMatchmakingStrategy(NO_SHUFFLE);
        const plan = strategy.generateRound(
            input({
                fixedTeams: [{ id: 'fixed-1', participantIds: ['a1', 'a2'] }],
                soloParticipantIds: solos(4),
            }),
        );

        // 1 équipe fixe + 2 éphémères feraient 3 équipes : on n'en forme qu'une, et deux joueurs
        // se reposent, plutôt que de laisser une équipe sans adversaire.
        expect(plan.matches.filter((m) => m.opponentRef !== null)).toHaveLength(1);
        expect(restingParticipants(plan)).toHaveLength(2);
    });

    it('met tout le monde au repos quand aucun match n’est possible', () => {
        const strategy = new DefaultMatchmakingStrategy(NO_SHUFFLE);
        const plan = strategy.generateRound(input({ soloParticipantIds: solos(3) }));

        expect(plan.matches.every((m) => m.opponentRef === null)).toBe(true);
        expect(restingParticipants(plan).sort()).toEqual(solos(3));
    });

    // Deux joueurs ne peuvent pas former un 2v2 : une équipe seule n'a pas d'adversaire. Avec la
    // taille 1 autorisée, ils jouent l'un contre l'autre plutôt que de rester assis.
    it('fait jouer deux joueurs en 1v1 quand la taille 1 est autorisée', () => {
        const strategy = new DefaultMatchmakingStrategy(NO_SHUFFLE);
        const plan = strategy.generateRound(
            input({
                soloParticipantIds: ['p1', 'p2'],
                config: baseConfig({ allowedTeamSizes: [1] }),
            }),
        );

        expect(plan.matches.filter((m) => m.opponentRef !== null)).toHaveLength(1);
        expect(restingParticipants(plan)).toHaveLength(0);
    });

    it('place tout le monde même quand la rotation ne peut pas être respectée', () => {
        const strategy = new DefaultMatchmakingStrategy(NO_SHUFFLE);
        const plan = strategy.generateRound(
            input({
                soloParticipantIds: solos(4),
                history: baseHistory({
                    recentRounds: [
                        round([
                            ['p1', 'p2'],
                            ['p3', 'p4'],
                        ]),
                        round([
                            ['p1', 'p3'],
                            ['p2', 'p4'],
                        ]),
                    ],
                }),
            }),
        );

        expect(allParticipants(plan)).toEqual(new Set(solos(4)));
        expect(plan.matches.filter((m) => m.opponentRef !== null)).toHaveLength(1);
    });

    it('ne duplique et ne perd jamais de participant, quelle que soit la config', () => {
        const strategy = new DefaultMatchmakingStrategy();
        const base = input({
            fixedTeams: [{ id: 'fixed-1', participantIds: ['a1', 'a2', 'a3'] }],
            soloParticipantIds: solos(9),
            config: baseConfig({ playersPerTeam: 3, allowedTeamSizes: [2], plateCount: 3 }),
        });

        for (let i = 0; i < 20; i++) {
            const plan = strategy.generateRound(base);
            expect(allParticipants(plan)).toEqual(new Set(solos(9)));

            const refsInMatches = plan.matches.flatMap((m) =>
                m.opponentRef ? [m.teamRef, m.opponentRef] : [m.teamRef],
            );
            expect(new Set(refsInMatches).size).toBe(refsInMatches.length);
        }
    });
});

function allParticipants(plan: { ephemeralTeams: { participantIds: string[] }[] }): Set<string> {
    return new Set(plan.ephemeralTeams.flatMap((t) => t.participantIds));
}

function restingParticipants(plan: {
    ephemeralTeams: { tempId: string; participantIds: string[] }[];
}): string[] {
    return plan.ephemeralTeams
        .filter((t) => t.tempId.startsWith('sit-out'))
        .flatMap((t) => t.participantIds);
}
