import { shuffleFisherYates } from 'src/modules/tournaments/utils/global.utils';
import { TrainingTeamComposition } from 'src/enum/training.enum';
import { GenerateRoundInput, MatchmakingPort, RoundPlan } from './matchmaking.types';
import { chooseDecomposition } from './team-decomposition';

interface TeamRef {
    ref: string;
    canonicalId: string;
    participantIds: string[];
}

// Placement is greedy: it can get stuck on the last players and rebuild a forbidden pair for lack
// of a free candidate. Rather than giving up right away, the split is replayed with another
// shuffle. The computation is in memory and negligible next to the database writes.
const PLACEMENT_ATTEMPTS = 10;

// A guest, or a player who has not played a match yet, has no known level. They are placed low in
// the ranking without being last: they play with a decent partner rather than with the best or
// the weakest player of the session.
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

        // No match is possible: three players with teams of two, for instance. Everyone rests, and
        // the UI explains why before the click.
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

        // A resting player becomes a one-player team without an opponent. That is the vocabulary
        // RoundPlan already knows how to persist, and it keeps the rest visible in the round -
        // admin side as well as on the player page - instead of silently disappearing.
        const restingTeams = resting.map((participantId, index) => ({
            tempId: `sit-out-${index + 1}`,
            participantIds: [participantId],
        }));

        // Fixed teams beyond the plate count wait for the next round.
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

        // Resting teams are kept out of the pairing: two players resting the same round would
        // otherwise end up facing each other in a 1v1.
        const restingMatches = [
            ...restingTeams.map((team) => ({ teamRef: team.tempId, opponentRef: null })),
            ...fixedWaiting.map((team) => ({ teamRef: team.id, opponentRef: null })),
        ];

        return {
            ephemeralTeams: [...playingTeams, ...restingTeams],
            matches: [...matches, ...restingMatches],
        };
    }

    /** Nobody can play: everyone rests, the round still exists. */
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
     * Who plays, who rests. Rest goes to those who have rested the least so far: over a whole
     * session everyone waits about as much as the others.
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

    /** Builds the teams, at random or by nearby levels depending on the session setting. */
    private buildGroups(
        input: GenerateRoundInput,
        playing: string[],
        groupSizes: number[],
        forbiddenPartners: Set<string>,
    ): string[][] {
        if (input.config.teamComposition === TrainingTeamComposition.LEARNING) {
            return this.buildLearningGroups(input, playing, groupSizes, forbiddenPartners);
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
     * Learning mode: players are ranked by level, then teams are served band by band - the best of
     * the top band with the best of the bottom band, and so on. Nobody ends up with a partner from
     * the other end of the ranking.
     *
     * Each slot draws from one contiguous band of the ranking, so every team spans the same level
     * bands whatever we do. The natural order (band member N to team N) gives the tightest balance,
     * so it is tried first; only when it would rebuild a forbidden pair do we reshuffle *within*
     * each band and keep the arrangement with the fewest repeats. The level mix is preserved, the
     * exact partner is not - which is what `avoidSamePartnerConsecutive` asks for.
     */
    private buildLearningGroups(
        input: GenerateRoundInput,
        playing: string[],
        groupSizes: number[],
        forbiddenPartners: Set<string>,
    ): string[][] {
        const ranked = this.rankByLevel(input, playing);

        const bands: string[][] = [];
        const maxSize = Math.max(0, ...groupSizes);
        let cursor = 0;
        for (let slot = 0; slot < maxSize; slot++) {
            const width = groupSizes.filter((size) => size > slot).length;
            bands.push(ranked.slice(cursor, cursor + width));
            cursor += width;
        }

        let best: string[][] | null = null;
        let fewest = Number.POSITIVE_INFINITY;
        for (let attempt = 0; attempt < PLACEMENT_ATTEMPTS; attempt++) {
            const arranged =
                attempt === 0 ? bands : bands.map((band) => shuffleFisherYates(band, this.random));
            const candidate = this.assembleBands(groupSizes, arranged);
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

    /** One member per band into each team still short of that slot, in band order. */
    private assembleBands(groupSizes: number[], bands: string[][]): string[][] {
        const groups: string[][] = groupSizes.map(() => []);
        for (let slot = 0; slot < bands.length; slot++) {
            let next = 0;
            for (let index = 0; index < groups.length; index++) {
                if (groupSizes[index] <= slot) continue;
                groups[index].push(bands[slot][next++]);
            }
        }
        return groups;
    }

    /** Strongest to weakest; unknown level placed at seven eighths of the ranking. */
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

    /** Greedy fill, avoiding forbidden pairs as long as a candidate is free. */
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
                if (candidateIndex === -1) candidateIndex = 0; // relaxed: no free candidate
                group.push(remaining.splice(candidateIndex, 1)[0]);
            }
            groups.push(group);
        }

        return groups;
    }

    /**
     * Pairs the teams. In learning mode nearby strengths meet so the matches stay close; otherwise
     * the order is drawn at random, avoiding recent opponents.
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

    /** Two by two in the order received: neighbours meet. */
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
            if (opponentIndex === -1) opponentIndex = 0; // relaxed: no unseen opponent

            const opponent = remaining.splice(opponentIndex, 1)[0];
            matches.push({ teamRef: current.ref, opponentRef: opponent.ref });
        }

        return matches;
    }

    /**
     * Pairs and match-ups to avoid. The depth adapts to the headcount: with many players several
     * rounds are taken into account, with four players the constraint would be impossible to keep,
     * so only the previous round counts.
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
     * How many rounds back can be required without getting stuck: a player has `headcount - 1`
     * possible partners and uses `size - 1` of them per round.
     */
    private rotationDepth(input: GenerateRoundInput): number {
        const players = input.soloParticipantIds.length;
        const size = Math.max(2, input.config.playersPerTeam);
        const partnersPerRound = size - 1;
        const reachable = Math.floor((players - 1) / partnersPerRound) - 1;
        return Math.max(1, Math.min(3, reachable));
    }
}

/** Number of forbidden pairs found in a split. */
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
