import { shuffleFisherYates } from 'src/modules/tournaments/utils/global.utils';
import { GenerateRoundInput, MatchmakingPort, RoundPlan } from './matchmaking.types';

interface TeamRef {
    ref: string;
    canonicalId: string;
    participantIds: string[];
}

// Ordre de relâchement des contraintes quand tout n'est pas simultanément satisfiable
// (assumption documentée dans le plan de développement, à confirmer sur des cas concrets) :
//   1. Taille d'équipe valide (playersPerTeam ou fallbackTeamSize) — non négociable.
//   2. allowSitOut / fallbackTeamSize pour absorber les effectifs impairs.
//   3. avoidSameOpponentConsecutive.
//   4. avoidSamePartnerConsecutive.
export class DefaultMatchmakingStrategy implements MatchmakingPort {
    constructor(private readonly random: () => number = Math.random) {}

    generateRound(input: GenerateRoundInput): RoundPlan {
        const forbiddenPartners = input.config.avoidSamePartnerConsecutive
            ? toPairSet(input.history.previousRoundPartnerPairs)
            : new Set<string>();

        const { groups } = this.splitSolosIntoGroups(
            input.soloParticipantIds,
            input.config,
            forbiddenPartners,
        );

        const ephemeralTeams = groups.map((participantIds, index) => ({
            tempId: `ephemeral-${index + 1}`,
            participantIds,
        }));

        const teamRefs: TeamRef[] = [
            ...input.fixedTeams.map((team) => ({
                ref: team.id,
                canonicalId: team.id,
                participantIds: team.participantIds,
            })),
            ...ephemeralTeams.map((team) => ({
                ref: team.tempId,
                canonicalId: canonicalOf(team.participantIds),
                participantIds: team.participantIds,
            })),
        ];

        const forbiddenOpponents = input.config.avoidSameOpponentConsecutive
            ? toPairSet(input.history.previousRoundOpponentCanonicalPairs)
            : new Set<string>();

        const matches = this.pairTeamRefs(
            shuffleFisherYates(teamRefs, this.random),
            forbiddenOpponents,
        );

        return { ephemeralTeams, matches };
    }

    /**
     * Répartit les solos en groupes de taille `playersPerTeam`, en absorbant un éventuel reste
     * via `fallbackTeamSize` (sauf si `allowSitOut`, auquel cas le reste est mis au repos).
     */
    private splitSolosIntoGroups(
        soloParticipantIds: string[],
        config: GenerateRoundInput['config'],
        forbiddenPartners: Set<string>,
    ): { groups: string[][]; sitOut: string[] } {
        const solos = shuffleFisherYates(soloParticipantIds, this.random);
        const target = config.playersPerTeam;
        const fallback = config.fallbackTeamSize;
        const n = solos.length;

        if (target <= 0 || n === 0) return { groups: [], sitOut: n === 0 ? [] : solos };

        const remainder = n % target;
        if (remainder === 0) {
            return { groups: this.groupBySize(solos, target, forbiddenPartners), sitOut: [] };
        }

        if (config.allowSitOut) {
            const { groups, leftover } = this.splitByGroupCount(solos, target, forbiddenPartners);
            return { groups, sitOut: leftover };
        }

        // Cherche le plus petit nombre `b` de groupes de taille fallback permettant d'absorber
        // exactement le reste avec des groupes de taille target par ailleurs.
        const decomposition = fallback > 0 ? findFallbackDecomposition(n, target, fallback) : null;
        if (decomposition) {
            const fallbackCount = decomposition.fallbackGroups * fallback;
            const fallbackGroups = this.groupBySize(
                solos.slice(0, fallbackCount),
                fallback,
                forbiddenPartners,
            );
            const targetGroups = this.groupBySize(
                solos.slice(fallbackCount),
                target,
                forbiddenPartners,
            );
            return { groups: [...fallbackGroups, ...targetGroups], sitOut: [] };
        }

        // Dernier recours (aucune décomposition exacte en groupes `target`/`fallback` n'existe
        // pour cet effectif, ex. n=5 avec target=4 et fallback=3) : la règle n°1 ci-dessus est
        // non négociable, donc le reste est mis au repos plutôt que de former un groupe de taille
        // invalide — y compris si allowSitOut=false, car une équipe hors {target, fallback} n'est
        // jamais une sortie acceptable, quelle que soit la config.
        const { groups, leftover } = this.splitByGroupCount(solos, target, forbiddenPartners);
        return { groups, sitOut: leftover };
    }

    /** `Math.floor(n / size)` groupes de `size`, le reste (< size) renvoyé à part. */
    private splitByGroupCount(
        solos: string[],
        size: number,
        forbiddenPartners: Set<string>,
    ): { groups: string[][]; leftover: string[] } {
        const groupCount = Math.floor(solos.length / size);
        const groups = this.groupBySize(solos.slice(0, groupCount * size), size, forbiddenPartners);
        const leftover = solos.slice(groupCount * size);
        return { groups, leftover };
    }

    /** Bin-packing glouton en groupes de `size`, évitant les paires interdites quand possible. */
    private groupBySize(
        participantIds: string[],
        size: number,
        forbiddenPairs: Set<string>,
    ): string[][] {
        if (size <= 0 || participantIds.length === 0) return [];
        const remaining = [...participantIds];
        const groups: string[][] = [];

        while (remaining.length > 0) {
            const group: string[] = [remaining.shift()!];
            while (group.length < size && remaining.length > 0) {
                let candidateIndex = remaining.findIndex(
                    (id) => !group.some((member) => forbiddenPairs.has(pairKey(member, id))),
                );
                if (candidateIndex === -1) candidateIndex = 0; // relâchement : aucun candidat sans conflit
                group.push(remaining.splice(candidateIndex, 1)[0]);
            }
            groups.push(group);
        }

        return groups;
    }

    /** Apparie les équipes deux à deux, en évitant les adversaires du round précédent quand possible. */
    private pairTeamRefs(
        teamRefs: TeamRef[],
        forbiddenOpponents: Set<string>,
    ): { teamRef: string; opponentRef: string | null }[] {
        const remaining = [...teamRefs];
        const matches: { teamRef: string; opponentRef: string | null }[] = [];

        while (remaining.length > 0) {
            const current = remaining.shift()!;
            if (remaining.length === 0) {
                matches.push({ teamRef: current.ref, opponentRef: null }); // bye
                break;
            }

            let opponentIndex = remaining.findIndex(
                (team) => !forbiddenOpponents.has(pairKey(current.canonicalId, team.canonicalId)),
            );
            if (opponentIndex === -1) opponentIndex = 0; // relâchement : aucun adversaire inédit disponible

            const opponent = remaining.splice(opponentIndex, 1)[0];
            matches.push({ teamRef: current.ref, opponentRef: opponent.ref });
        }

        return matches;
    }
}

function pairKey(a: string, b: string): string {
    return [a, b].sort().join('|');
}

function toPairSet(pairs: [string, string][]): Set<string> {
    return new Set(pairs.map(([a, b]) => pairKey(a, b)));
}

function canonicalOf(participantIds: string[]): string {
    return [...participantIds].sort().join(',');
}

/**
 * Cherche le plus petit nombre de groupes de taille `fallback` tel que le reste de `n` se
 * décompose exactement en groupes de taille `target`. Retourne `null` si aucune combinaison
 * dans les bornes de `n` ne fonctionne (config incompatible avec l'effectif).
 */
function findFallbackDecomposition(
    n: number,
    target: number,
    fallback: number,
): { fallbackGroups: number; targetGroups: number } | null {
    const maxFallbackGroups = Math.floor(n / fallback);
    for (let b = 1; b <= maxFallbackGroups; b++) {
        const remainder = n - b * fallback;
        if (remainder >= 0 && remainder % target === 0) {
            return { fallbackGroups: b, targetGroups: remainder / target };
        }
    }
    return null;
}
