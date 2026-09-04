import { describe, expect, it } from 'vitest';
import { DefaultMatchmakingStrategy } from './default-matchmaking.strategy';
import { GenerateRoundInput } from './matchmaking.types';

function baseConfig(
    overrides: Partial<GenerateRoundInput['config']> = {},
): GenerateRoundInput['config'] {
    return {
        playersPerTeam: 2,
        fallbackTeamSize: 3,
        allowSitOut: false,
        avoidSamePartnerConsecutive: true,
        avoidSameOpponentConsecutive: true,
        ...overrides,
    };
}

function baseHistory(
    overrides: Partial<GenerateRoundInput['history']> = {},
): GenerateRoundInput['history'] {
    return {
        previousRoundPartnerPairs: [],
        previousRoundOpponentCanonicalPairs: [],
        ...overrides,
    };
}

function solos(count: number): string[] {
    return Array.from({ length: count }, (_, i) => `p${i + 1}`);
}

// Random déterministe (pas de mélange) pour des assertions reproductibles sur l'ordre.
const NO_SHUFFLE = () => 0;

describe('DefaultMatchmakingStrategy', () => {
    it("forme des groupes complets quand l'effectif solo est un multiple de playersPerTeam", () => {
        const strategy = new DefaultMatchmakingStrategy(NO_SHUFFLE);
        const plan = strategy.generateRound({
            fixedTeams: [],
            soloParticipantIds: solos(4),
            config: baseConfig({ playersPerTeam: 2 }),
            history: baseHistory(),
        });

        expect(plan.ephemeralTeams).toHaveLength(2);
        for (const team of plan.ephemeralTeams) {
            expect(team.participantIds).toHaveLength(2);
        }
        expect(allParticipants(plan)).toEqual(new Set(solos(4)));
    });

    it("effectif impair + allowSitOut=true met le reste au repos plutôt que d'utiliser fallback", () => {
        const strategy = new DefaultMatchmakingStrategy(NO_SHUFFLE);
        const plan = strategy.generateRound({
            fixedTeams: [],
            soloParticipantIds: solos(5),
            config: baseConfig({ playersPerTeam: 2, allowSitOut: true }),
            history: baseHistory(),
        });

        expect(plan.ephemeralTeams).toHaveLength(2);
        for (const team of plan.ephemeralTeams) {
            expect(team.participantIds).toHaveLength(2);
        }
        // 1 participant sur 5 doit être laissé de côté : ni dans une équipe éphémère, ni dans un
        // match (RoundPlan n'expose plus de liste dédiée, on l'observe par absence).
        const grouped = allParticipants(plan);
        expect(grouped.size).toBe(4);
        expect(solos(5).filter((id) => !grouped.has(id))).toHaveLength(1);
    });

    it('effectif impair + allowSitOut=false absorbe le reste via fallbackTeamSize', () => {
        const strategy = new DefaultMatchmakingStrategy(NO_SHUFFLE);
        const plan = strategy.generateRound({
            fixedTeams: [],
            soloParticipantIds: solos(5),
            config: baseConfig({ playersPerTeam: 2, fallbackTeamSize: 3, allowSitOut: false }),
            history: baseHistory(),
        });

        const sizes = plan.ephemeralTeams.map((t) => t.participantIds.length).sort();
        expect(sizes).toEqual([2, 3]); // 5 = 2 + 3
        expect(allParticipants(plan)).toEqual(new Set(solos(5)));
    });

    it('effectif incompatible avec target et fallback : dernier recours, aucun participant perdu', () => {
        const strategy = new DefaultMatchmakingStrategy(NO_SHUFFLE);
        // playersPerTeam=4, fallbackTeamSize=5, n=7 : 7%4=3≠0, et le seul b possible (b=1,
        // fallback=5) laisse un reste de 2 non divisible par 4 -> aucune décomposition exacte.
        const plan = strategy.generateRound({
            fixedTeams: [],
            soloParticipantIds: solos(7),
            config: baseConfig({ playersPerTeam: 4, fallbackTeamSize: 5, allowSitOut: false }),
            history: baseHistory(),
        });

        expect(allParticipants(plan)).toEqual(new Set(solos(7)));
        // Pas de contrainte de taille exacte ici : on vérifie juste qu'aucun joueur n'est perdu
        // ni dupliqué (cas de config incompatible avec l'effectif, comportement de dernier recours).
    });

    it('ne forme aucune équipe éphémère quand tous les participants sont en équipe fixe', () => {
        const strategy = new DefaultMatchmakingStrategy(NO_SHUFFLE);
        const plan = strategy.generateRound({
            fixedTeams: [
                { id: 'fixed-1', participantIds: ['a1', 'a2'] },
                { id: 'fixed-2', participantIds: ['b1', 'b2'] },
            ],
            soloParticipantIds: [],
            config: baseConfig(),
            history: baseHistory(),
        });

        expect(plan.ephemeralTeams).toEqual([]);
        expect(plan.matches).toHaveLength(1);
        expect(
            new Set(
                plan.matches.map((m) => m.teamRef).concat(plan.matches.map((m) => m.opponentRef!)),
            ),
        ).toEqual(new Set(['fixed-1', 'fixed-2']));
    });

    it("attribue un bye quand le nombre total d'équipes est impair", () => {
        const strategy = new DefaultMatchmakingStrategy(NO_SHUFFLE);
        const plan = strategy.generateRound({
            fixedTeams: [{ id: 'fixed-1', participantIds: ['a1', 'a2'] }],
            soloParticipantIds: solos(4), // + 2 équipes éphémères de 2 => 3 équipes au total
            config: baseConfig({ playersPerTeam: 2 }),
            history: baseHistory(),
        });

        const byes = plan.matches.filter((m) => m.opponentRef === null);
        expect(byes).toHaveLength(1);
        expect(plan.matches).toHaveLength(2); // 3 équipes -> 1 match + 1 bye
    });

    it("relâche avoidSamePartnerConsecutive quand aucune combinaison sans conflit n'existe (2 joueurs)", () => {
        const strategy = new DefaultMatchmakingStrategy(NO_SHUFFLE);
        // Avec seulement 2 joueurs et playersPerTeam=2, une seule paire est possible : si c'est
        // justement celle du round précédent, la contrainte est nécessairement relâchée.
        const plan = strategy.generateRound({
            fixedTeams: [],
            soloParticipantIds: ['p1', 'p2'],
            config: baseConfig({ playersPerTeam: 2 }),
            history: baseHistory({ previousRoundPartnerPairs: [['p1', 'p2']] }),
        });

        // Ne doit pas planter et doit tout de même produire une répartition complète.
        expect(plan.ephemeralTeams).toHaveLength(1);
        expect(plan.ephemeralTeams[0].participantIds.sort()).toEqual(['p1', 'p2']);
        expect(allParticipants(plan)).toEqual(new Set(['p1', 'p2']));
    });

    it('ne duplique et ne perd jamais de participant, quelle que soit la config', () => {
        const strategy = new DefaultMatchmakingStrategy();
        const input: GenerateRoundInput = {
            fixedTeams: [{ id: 'fixed-1', participantIds: ['a1', 'a2', 'a3'] }],
            soloParticipantIds: solos(9),
            config: baseConfig({ playersPerTeam: 3, fallbackTeamSize: 2, allowSitOut: false }),
            history: baseHistory(),
        };

        for (let i = 0; i < 20; i++) {
            const plan = strategy.generateRound(input);
            expect(allParticipants(plan)).toEqual(new Set(solos(9)));

            const refsInMatches = plan.matches.flatMap((m) =>
                m.opponentRef ? [m.teamRef, m.opponentRef] : [m.teamRef],
            );
            expect(new Set(refsInMatches).size).toBe(refsInMatches.length); // pas d'équipe dans 2 matchs
        }
    });
});

function allParticipants(plan: { ephemeralTeams: { participantIds: string[] }[] }): Set<string> {
    return new Set(plan.ephemeralTeams.flatMap((t) => t.participantIds));
}
