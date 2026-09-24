import { shuffleFisherYates } from 'src/modules/tournaments/utils/global.utils';
import { TrainingTeamComposition } from 'src/enum/training.enum';
import { GenerateRoundInput, MatchmakingPort, RoundPlan } from './matchmaking.types';
import { chooseDecomposition } from './team-decomposition';

interface TeamRef {
    ref: string;
    canonicalId: string;
    participantIds: string[];
}

// Le placement est glouton : il peut se coincer sur les derniers joueurs et reformer un binôme
// interdit faute de candidat libre. Plutôt que de céder tout de suite, on rejoue la répartition
// avec un autre mélange. Le calcul est en mémoire et négligeable devant les écritures en base.
const PLACEMENT_ATTEMPTS = 10;

// Un invité, ou un joueur qui n'a pas encore disputé de match, n'a pas de niveau connu. On le
// place vers le bas du classement sans le mettre dernier : il jouera avec un partenaire correct
// plutôt qu'avec le meilleur ou le plus faible de la séance.
const UNKNOWN_LEVEL_POSITION = 7 / 8;

export class DefaultMatchmakingStrategy implements MatchmakingPort {
    constructor(private readonly random: () => number = Math.random) {}

    generateRound(input: GenerateRoundInput): RoundPlan {
        const decomposition = chooseDecomposition({
            soloCount: input.soloParticipantIds.length,
            fixedTeamCount: input.fixedTeams.length,
            playersPerTeam: input.config.playersPerTeam,
            allowedTeamSizes: input.config.allowedTeamSizes,
            preferTargetTeamSize: input.config.preferTargetTeamSize,
            plateCount: input.config.plateCount,
        });

        // Aucun match possible : trois joueurs et des équipes de deux, par exemple. Tout le monde
        // se repose, et l'interface explique pourquoi avant même le clic.
        if (!decomposition) {
            return this.allAtRest(input);
        }

        const { playing, resting } = this.splitPlayersAndRest(input, decomposition.sitOutCount);

        const forbiddenPartners = this.forbiddenPairs(input, 'partner');
        const groups = this.buildGroups(
            input,
            playing,
            decomposition.groupSizes,
            forbiddenPartners,
        );

        const playingTeams = groups.map((participantIds, index) => ({
            tempId: `ephemeral-${index + 1}`,
            participantIds,
        }));

        // Un joueur au repos devient une équipe d'un seul joueur, sans adversaire. C'est le
        // vocabulaire que RoundPlan sait déjà persister, et il reste ainsi visible dans le round
        // — côté admin comme sur sa propre page — au lieu d'en disparaître silencieusement.
        const restingTeams = resting.map((participantId, index) => ({
            tempId: `sit-out-${index + 1}`,
            participantIds: [participantId],
        }));

        // Les équipes fixes qui dépassent le nombre de plaques attendent le round suivant.
        const fixedPlaying = input.fixedTeams.slice(0, decomposition.fixedTeamsPlaying);
        const fixedWaiting = input.fixedTeams.slice(decomposition.fixedTeamsPlaying);

        const teamRefs: TeamRef[] = [
            ...fixedPlaying.map((team) => ({
                ref: team.id,
                canonicalId: team.id,
                participantIds: team.participantIds,
            })),
            ...playingTeams.map((team) => ({
                ref: team.tempId,
                canonicalId: canonicalOf(team.participantIds),
                participantIds: team.participantIds,
            })),
        ];

        const matches = this.pairTeams(input, teamRefs);

        // Les équipes au repos sont tenues hors de l'appariement : deux joueurs mis au repos le
        // même round s'y retrouveraient sinon opposés l'un à l'autre en 1 contre 1.
        const restingMatches = [
            ...restingTeams.map((team) => ({ teamRef: team.tempId, opponentRef: null })),
            ...fixedWaiting.map((team) => ({ teamRef: team.id, opponentRef: null })),
        ];

        return {
            ephemeralTeams: [...playingTeams, ...restingTeams],
            matches: [...matches, ...restingMatches],
        };
    }

    /** Personne ne peut jouer : chacun est au repos, le round existe quand même. */
    private allAtRest(input: GenerateRoundInput): RoundPlan {
        const restingTeams = input.soloParticipantIds.map((participantId, index) => ({
            tempId: `sit-out-${index + 1}`,
            participantIds: [participantId],
        }));

        return {
            ephemeralTeams: restingTeams,
            matches: [
                ...restingTeams.map((team) => ({ teamRef: team.tempId, opponentRef: null })),
                ...input.fixedTeams.map((team) => ({ teamRef: team.id, opponentRef: null })),
            ],
        };
    }

    /**
     * Qui joue, qui se repose. Le repos revient à ceux qui se sont le moins reposés jusqu'ici :
     * sur une séance entière, chacun attend son tour à peu près autant que les autres.
     */
    private splitPlayersAndRest(
        input: GenerateRoundInput,
        sitOutCount: number,
    ): { playing: string[]; resting: string[] } {
        if (sitOutCount <= 0) {
            return { playing: [...input.soloParticipantIds], resting: [] };
        }

        const counts = input.history.sitOutCountByParticipant;
        const ordered = shuffleFisherYates(input.soloParticipantIds, this.random).sort(
            (a, b) => (counts[a] ?? 0) - (counts[b] ?? 0),
        );

        return {
            resting: ordered.slice(0, sitOutCount),
            playing: ordered.slice(sitOutCount),
        };
    }

    /** Forme les équipes, au hasard ou par niveaux voisins selon le réglage de la séance. */
    private buildGroups(
        input: GenerateRoundInput,
        playing: string[],
        groupSizes: number[],
        forbiddenPartners: Set<string>,
    ): string[][] {
        if (input.config.teamComposition === TrainingTeamComposition.LEARNING) {
            return this.buildLearningGroups(input, playing, groupSizes);
        }

        let best: string[][] | null = null;
        let fewest = Number.POSITIVE_INFINITY;

        for (let attempt = 0; attempt < PLACEMENT_ATTEMPTS; attempt++) {
            const candidate = this.fillGroups(
                shuffleFisherYates(playing, this.random),
                groupSizes,
                forbiddenPartners,
            );
            const conflicts = countForbiddenPairs(candidate, forbiddenPartners);
            if (conflicts === 0) {
                return candidate;
            }
            if (conflicts < fewest) {
                fewest = conflicts;
                best = candidate;
            }
        }

        return best!;
    }

    /**
     * Apprentissage : on classe les joueurs par niveau, puis on sert les équipes par tranches —
     * le meilleur de la tranche haute avec le meilleur de la tranche basse, et ainsi de suite.
     * Personne ne se retrouve donc avec un partenaire à l'autre bout du classement.
     */
    private buildLearningGroups(
        input: GenerateRoundInput,
        playing: string[],
        groupSizes: number[],
    ): string[][] {
        const ranked = this.rankByLevel(input, playing);
        const groups: string[][] = groupSizes.map(() => []);
        let next = 0;

        const maxSize = Math.max(0, ...groupSizes);
        for (let slot = 0; slot < maxSize; slot++) {
            for (let index = 0; index < groups.length; index++) {
                if (groupSizes[index] <= slot) continue;
                groups[index].push(ranked[next++]);
            }
        }

        return groups;
    }

    /** Du plus fort au plus faible ; niveau inconnu placé aux sept huitièmes du classement. */
    private rankByLevel(input: GenerateRoundInput, participantIds: string[]): string[] {
        const known = participantIds.filter((id) => input.levelByParticipant[id] !== undefined);
        const unknown = shuffleFisherYates(
            participantIds.filter((id) => input.levelByParticipant[id] === undefined),
            this.random,
        );

        known.sort((a, b) => input.levelByParticipant[b] - input.levelByParticipant[a]);
        if (unknown.length === 0) {
            return known;
        }

        const position = Math.min(known.length, Math.round(known.length * UNKNOWN_LEVEL_POSITION));
        return [...known.slice(0, position), ...unknown, ...known.slice(position)];
    }

    /** Remplissage glouton, en évitant les binômes interdits tant qu'un candidat reste libre. */
    private fillGroups(
        participantIds: string[],
        groupSizes: number[],
        forbiddenPairs: Set<string>,
    ): string[][] {
        const remaining = [...participantIds];
        const groups: string[][] = [];

        for (const size of groupSizes) {
            const group: string[] = [];
            while (group.length < size && remaining.length > 0) {
                let candidateIndex = remaining.findIndex(
                    (id) => !group.some((member) => forbiddenPairs.has(pairKey(member, id))),
                );
                if (candidateIndex === -1) candidateIndex = 0; // relâchement : aucun candidat libre
                group.push(remaining.splice(candidateIndex, 1)[0]);
            }
            groups.push(group);
        }

        return groups;
    }

    /**
     * Apparie les équipes. En apprentissage, les forces voisines se rencontrent pour que les
     * matchs restent serrés ; sinon l'ordre est tiré au sort, en évitant les oppositions récentes.
     */
    private pairTeams(
        input: GenerateRoundInput,
        teamRefs: TeamRef[],
    ): { teamRef: string; opponentRef: string | null }[] {
        const forbiddenOpponents = this.forbiddenPairs(input, 'opponent');

        if (input.config.teamComposition === TrainingTeamComposition.LEARNING) {
            const byStrength = [...teamRefs].sort(
                (a, b) => this.teamLevel(input, b) - this.teamLevel(input, a),
            );
            return this.pairInOrder(byStrength);
        }

        let best: { teamRef: string; opponentRef: string | null }[] | null = null;
        let fewest = Number.POSITIVE_INFINITY;
        const canonicalByRef = new Map(teamRefs.map((team) => [team.ref, team.canonicalId]));

        for (let attempt = 0; attempt < PLACEMENT_ATTEMPTS; attempt++) {
            const candidate = this.pairAvoidingOpponents(
                shuffleFisherYates(teamRefs, this.random),
                forbiddenOpponents,
            );
            const conflicts = candidate.filter(
                (match) =>
                    match.opponentRef !== null &&
                    forbiddenOpponents.has(
                        pairKey(
                            canonicalByRef.get(match.teamRef)!,
                            canonicalByRef.get(match.opponentRef)!,
                        ),
                    ),
            ).length;
            if (conflicts === 0) {
                return candidate;
            }
            if (conflicts < fewest) {
                fewest = conflicts;
                best = candidate;
            }
        }

        return best!;
    }

    private teamLevel(input: GenerateRoundInput, team: TeamRef): number {
        const levels = team.participantIds.map((id) => input.levelByParticipant[id] ?? 0);
        return levels.length === 0
            ? 0
            : levels.reduce((sum, level) => sum + level, 0) / levels.length;
    }

    /** Deux à deux dans l'ordre reçu : les voisins se rencontrent. */
    private pairInOrder(teamRefs: TeamRef[]): { teamRef: string; opponentRef: string | null }[] {
        const matches: { teamRef: string; opponentRef: string | null }[] = [];
        for (let index = 0; index < teamRefs.length; index += 2) {
            matches.push({
                teamRef: teamRefs[index].ref,
                opponentRef: teamRefs[index + 1]?.ref ?? null,
            });
        }
        return matches;
    }

    private pairAvoidingOpponents(
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
            if (opponentIndex === -1) opponentIndex = 0; // relâchement : aucun adversaire inédit

            const opponent = remaining.splice(opponentIndex, 1)[0];
            matches.push({ teamRef: current.ref, opponentRef: opponent.ref });
        }

        return matches;
    }

    /**
     * Les binômes et oppositions à éviter. La profondeur s'adapte à l'effectif : avec beaucoup de
     * joueurs on remonte plusieurs rounds, avec quatre joueurs la contrainte deviendrait
     * impossible à tenir, donc on se limite au round précédent.
     */
    private forbiddenPairs(input: GenerateRoundInput, kind: 'partner' | 'opponent'): Set<string> {
        const enabled =
            kind === 'partner'
                ? input.config.avoidSamePartnerConsecutive
                : input.config.avoidSameOpponentConsecutive;
        if (!enabled) {
            return new Set();
        }

        const depth = this.rotationDepth(input);
        const pairs = new Set<string>();
        for (const round of input.history.recentRounds.slice(0, depth)) {
            const list = kind === 'partner' ? round.partnerPairs : round.opponentCanonicalPairs;
            for (const [a, b] of list) {
                pairs.add(pairKey(a, b));
            }
        }
        return pairs;
    }

    /**
     * Combien de rounds en arrière on peut exiger sans se coincer : un joueur a
     * `effectif - 1` partenaires possibles et en consomme `taille - 1` par round.
     */
    private rotationDepth(input: GenerateRoundInput): number {
        const players = input.soloParticipantIds.length;
        const size = Math.max(2, input.config.playersPerTeam);
        const partnersPerRound = size - 1;
        const reachable = Math.floor((players - 1) / partnersPerRound) - 1;
        return Math.max(1, Math.min(3, reachable));
    }
}

/** Nombre de binômes interdits présents dans une répartition. */
function countForbiddenPairs(groups: string[][], forbiddenPairs: Set<string>): number {
    let count = 0;
    for (const group of groups) {
        for (let i = 0; i < group.length; i++) {
            for (let j = i + 1; j < group.length; j++) {
                if (forbiddenPairs.has(pairKey(group[i], group[j]))) count++;
            }
        }
    }
    return count;
}

function pairKey(a: string, b: string): string {
    return [a, b].sort().join('|');
}

function canonicalOf(participantIds: string[]): string {
    return [...participantIds].sort().join(',');
}
