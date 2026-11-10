import { shuffleFisherYates } from 'src/modules/tournaments/utils/global.utils';
import { TrainingTeamComposition } from 'src/enum/training.enum';
import { GenerateRoundInput, MatchmakingPort, RoundPlan } from './matchmaking.types';
import { chooseDecomposition } from './team-decomposition';

/** Pairs to avoid, with their weight: the more recent the round they played in, the heavier. */
type ForbiddenPairs = Map<string, number>;

interface TeamRef {
    ref: string;
    canonicalId: string;
    participantIds: string[];
}

/** What the fallback pick needs to know besides the rotation. */
interface FallbackPick {
    slots: number;
    fallbackTeamCount: number;
    targetTeamCount: number;
    forbiddenPartners: ForbiddenPairs;
}

/** Players split into teams of the given sizes, independently of the other parts. */
interface GroupPart {
    players: string[];
    sizes: number[];
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

        // Fixed teams beyond the plate count wait for the next round: those that waited the most
        // play first, otherwise the last team of the list would wait every round.
        const fixedOrder = this.fixedTeamsByRest(input, decomposition.fixedTeamsPlaying);
        const fixedPlaying = fixedOrder.slice(0, decomposition.fixedTeamsPlaying);
        const fixedWaiting = fixedOrder.slice(decomposition.fixedTeamsPlaying);

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

    /** Most rested first (average over the members), ties drawn at random. */
    private fixedTeamsByRest(
        input: GenerateRoundInput,
        playingCount: number,
    ): GenerateRoundInput['fixedTeams'] {
        if (playingCount >= input.fixedTeams.length) {
            return input.fixedTeams;
        }
        const counts = input.history.sitOutCountByParticipant;
        const restOf = (team: GenerateRoundInput['fixedTeams'][number]) =>
            team.participantIds.length === 0
                ? 0
                : team.participantIds.reduce((sum, id) => sum + (counts[id] ?? 0), 0) /
                  team.participantIds.length;
        return shuffleFisherYates(input.fixedTeams, this.random).sort(
            (a, b) => restOf(b) - restOf(a),
        );
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
     * Who plays, who rests. Rest goes to those who have rested the least so far, then with the same
     * tie-breaks as the fallback teams: over a whole session everyone waits about as much as the
     * others, and nobody rests twice in a row while others rested long ago.
     */
    private splitPlayersAndRest(
        input: GenerateRoundInput,
        sitOutCount: number,
    ): { playing: string[]; resting: string[] } {
        if (sitOutCount <= 0) {
            return { playing: [...input.soloParticipantIds], resting: [] };
        }

        const ordered = this.rotationOrder(
            input,
            input.soloParticipantIds,
            input.history.sitOutCountByParticipant,
            (round) => round.restingParticipantIds,
        );

        return {
            resting: ordered.slice(0, sitOutCount),
            playing: ordered.slice(sitOutCount),
        };
    }

    /**
     * Builds the teams, at random or by nearby levels depending on the session setting.
     *
     * Who fills the fallback-size teams is decided first, from the history: left to the draw (or to
     * the level bands), the same players would carry the odd team round after round. Each part is
     * then built on its own.
     */
    private buildGroups(
        input: GenerateRoundInput,
        playing: string[],
        groupSizes: number[],
        forbiddenPartners: ForbiddenPairs,
    ): string[][] {
        const target = input.config.playersPerTeam;
        const fallbackSizes = groupSizes.filter((size) => size !== target);
        const fallbackPlayers = this.pickFallbackPlayers(input, playing, {
            slots: fallbackSizes.reduce((sum, size) => sum + size, 0),
            fallbackTeamCount: fallbackSizes.length,
            targetTeamCount: groupSizes.length - fallbackSizes.length,
            forbiddenPartners,
        });
        const inFallback = new Set(fallbackPlayers);
        const parts: GroupPart[] = [
            { players: fallbackPlayers, sizes: fallbackSizes },
            {
                players: playing.filter((id) => !inFallback.has(id)),
                sizes: groupSizes.filter((size) => size === target),
            },
        ].filter((part) => part.sizes.length > 0);

        if (input.config.teamComposition === TrainingTeamComposition.LEARNING) {
            return this.buildLearningGroups(input, parts, forbiddenPartners);
        }

        let best: string[][] | null = null;
        let fewest = Number.POSITIVE_INFINITY;

        for (let attempt = 0; attempt < PLACEMENT_ATTEMPTS; attempt++) {
            const candidate = parts.flatMap((part) =>
                this.fillGroups(
                    shuffleFisherYates(part.players, this.random),
                    part.sizes,
                    forbiddenPartners,
                ),
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
     * Players for the fallback-size teams: those who have played the fewest rounds in one, then
     * those whose last time is the oldest, then at random.
     */
    private pickFallbackPlayers(
        input: GenerateRoundInput,
        playing: string[],
        { slots, fallbackTeamCount, targetTeamCount, forbiddenPartners }: FallbackPick,
    ): string[] {
        if (slots <= 0) {
            return [];
        }
        if (slots >= playing.length) {
            return [...playing];
        }

        const rank = this.rotationRank(
            input,
            input.history.fallbackCountByParticipant,
            (round) => round.fallbackParticipantIds,
        );
        const ordered = shuffleFisherYates(playing, this.random).sort(rank);

        // The rotation only fixes who must go; among the players tied at the cut-off, the choice is
        // free. When a part forms a single team (e.g. one trio, or the lone pair left with 5
        // players), that choice alone decides partners: pick the tied players that rebuild the
        // fewest recent pairs instead of leaving it to the draw.
        const weighFallback = fallbackTeamCount === 1;
        const weighRest = targetTeamCount === 1;
        if (forbiddenPartners.size === 0 || (!weighFallback && !weighRest)) {
            return ordered.slice(0, slots);
        }
        const cutoff = ordered[slots - 1];
        const sure = ordered.filter((id) => rank(id, cutoff) < 0);
        const tied = ordered.filter((id) => rank(id, cutoff) === 0);
        const needed = slots - sure.length;
        if (tied.length === needed) {
            return ordered.slice(0, slots);
        }

        let best = [...sure, ...tied.slice(0, needed)];
        let fewest = Number.POSITIVE_INFINITY;
        for (let attempt = 0; attempt < PLACEMENT_ATTEMPTS * 5; attempt++) {
            const picked =
                attempt === 0
                    ? tied.slice(0, needed)
                    : shuffleFisherYates(tied, this.random).slice(0, needed);
            const pool = [...sure, ...picked];
            const inPool = new Set(pool);
            const conflicts =
                (weighFallback ? countForbiddenPairs([pool], forbiddenPartners) : 0) +
                (weighRest
                    ? countForbiddenPairs(
                          [playing.filter((id) => !inPool.has(id))],
                          forbiddenPartners,
                      )
                    : 0);
            if (conflicts < fewest) {
                fewest = conflicts;
                best = pool;
            }
            if (conflicts === 0) break;
        }
        return best;
    }

    /**
     * Whose turn it is for a chore (resting, a fallback team): first those who did it the fewest
     * times, then those whose last time is the oldest, then those with the shortest current streak,
     * then at random.
     */
    private rotationOrder(
        input: GenerateRoundInput,
        candidates: string[],
        counts: Record<string, number>,
        idsOfRound: (round: GenerateRoundInput['history']['recentRounds'][number]) => string[],
    ): string[] {
        return shuffleFisherYates(candidates, this.random).sort(
            this.rotationRank(input, counts, idsOfRound),
        );
    }

    /** Comparator behind rotationOrder: 0 means a tie, left to the draw. */
    private rotationRank(
        input: GenerateRoundInput,
        counts: Record<string, number>,
        idsOfRound: (round: GenerateRoundInput['history']['recentRounds'][number]) => string[],
    ): (a: string, b: string) => number {
        const recent = input.history.recentRounds.map((round) => new Set(idsOfRound(round)));
        const roundsAgo = (id: string) => {
            const index = recent.findIndex((ids) => ids.has(id));
            return index === -1 ? Number.POSITIVE_INFINITY : index;
        };
        const streak = (id: string) => {
            const index = recent.findIndex((ids) => !ids.has(id));
            return index === -1 ? recent.length : index;
        };

        return (a, b) =>
            (counts[a] ?? 0) - (counts[b] ?? 0) ||
            compareDesc(roundsAgo(a), roundsAgo(b)) ||
            streak(a) - streak(b);
    }

    /**
     * Learning mode: players are ranked by level, then teams are served band by band - the best of
     * the top band with the best of the bottom band, and so on. Nobody ends up with a partner from
     * the other end of the ranking. Each part (fallback-size teams, target-size teams) is ranked
     * and banded on its own, so the fallback players are balanced among themselves.
     *
     * Each slot draws from one contiguous band of the ranking, so every team spans the same level
     * bands whatever we do. The natural order (band member N to team N) gives the tightest balance,
     * so it is tried first; only when it would rebuild a forbidden pair do we reshuffle *within*
     * each band and keep the arrangement with the fewest repeats. The level mix is preserved, the
     * exact partner is not - which is what `avoidSamePartnerConsecutive` asks for.
     */
    private buildLearningGroups(
        input: GenerateRoundInput,
        parts: GroupPart[],
        forbiddenPartners: ForbiddenPairs,
    ): string[][] {
        const banded = parts.map((part) => ({
            sizes: part.sizes,
            bands: this.levelBands(this.rankByLevel(input, part.players), part.sizes),
        }));

        // Natural order first, then every rotation of the bands against each other (a valid one
        // often exists, e.g. shifting partners by one), then random reshuffles: luck alone could
        // miss an arrangement that exists.
        const rotations = Math.max(0, ...banded.flatMap(({ bands }) => bands.map((b) => b.length)));
        let best: string[][] | null = null;
        let fewest = Number.POSITIVE_INFINITY;
        for (let attempt = 0; attempt < rotations + PLACEMENT_ATTEMPTS; attempt++) {
            const candidate = banded.flatMap(({ sizes, bands }) =>
                this.assembleBands(
                    sizes,
                    attempt < rotations
                        ? bands.map((band, slot) => rotate(band, attempt * slot))
                        : bands.map((band) => shuffleFisherYates(band, this.random)),
                ),
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

    /** Slot N of the teams draws from band N: as many players as teams with at least N+1 places. */
    private levelBands(ranked: string[], groupSizes: number[]): string[][] {
        const bands: string[][] = [];
        const maxSize = Math.max(0, ...groupSizes);
        let cursor = 0;
        for (let slot = 0; slot < maxSize; slot++) {
            const width = groupSizes.filter((size) => size > slot).length;
            bands.push(ranked.slice(cursor, cursor + width));
            cursor += width;
        }
        return bands;
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
        forbiddenPairs: ForbiddenPairs,
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
     * Pairs the teams, same sizes first. In learning mode nearby strengths meet so the matches stay
     * close; otherwise the order is drawn at random, avoiding recent opponents.
     */
    private pairTeams(
        input: GenerateRoundInput,
        teamRefs: TeamRef[],
    ): { teamRef: string; opponentRef: string | null }[] {
        const forbiddenOpponents = this.forbiddenPairs(input, 'opponent');
        return this.splitBySize(input, teamRefs).flatMap((group) =>
            this.pairGroup(input, group, forbiddenOpponents),
        );
    }

    /**
     * Teams of the same size meet first: two trios play each other rather than each facing a
     * pair. Each size with an odd count gives up one team, and only those leftovers are mixed.
     * With a single size, the teams go through untouched (no extra draw).
     */
    private splitBySize(input: GenerateRoundInput, teamRefs: TeamRef[]): TeamRef[][] {
        const bySize = new Map<number, TeamRef[]>();
        for (const team of teamRefs) {
            const size = team.participantIds.length;
            bySize.set(size, [...(bySize.get(size) ?? []), team]);
        }
        if (bySize.size <= 1) {
            return [teamRefs];
        }

        const groups: TeamRef[][] = [];
        const leftovers: TeamRef[] = [];
        for (const group of bySize.values()) {
            if (group.length % 2 === 0) {
                groups.push(group);
                continue;
            }
            // Learning mode: the weakest of the size is the one mixed, so it meets a team of its
            // level among the leftovers. Otherwise the one mixed is drawn at random.
            const ordered =
                input.config.teamComposition === TrainingTeamComposition.LEARNING
                    ? [...group].sort((x, y) => this.teamLevel(input, y) - this.teamLevel(input, x))
                    : shuffleFisherYates(group, this.random);
            leftovers.push(ordered[ordered.length - 1]);
            if (ordered.length > 1) groups.push(ordered.slice(0, -1));
        }
        return leftovers.length > 0 ? [...groups, leftovers] : groups;
    }

    private pairGroup(
        input: GenerateRoundInput,
        teamRefs: TeamRef[],
        forbiddenOpponents: ForbiddenPairs,
    ): { teamRef: string; opponentRef: string | null }[] {
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
        forbiddenOpponents: ForbiddenPairs,
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
    private forbiddenPairs(
        input: GenerateRoundInput,
        kind: 'partner' | 'opponent',
    ): ForbiddenPairs {
        const enabled =
            kind === 'partner'
                ? input.config.avoidSamePartnerConsecutive
                : input.config.avoidSameOpponentConsecutive;
        if (!enabled) {
            return new Map();
        }

        // When every arrangement repeats a pair, the one from the previous round must be the last
        // resort: each round back weighs ten times less than the next one, so a single repeat
        // from the previous round outweighs any number of older ones.
        const depth = this.rotationDepth(input);
        const pairs: ForbiddenPairs = new Map();
        input.history.recentRounds.slice(0, depth).forEach((round, roundsBack) => {
            const weight = 10 ** (depth - 1 - roundsBack);
            const list = kind === 'partner' ? round.partnerPairs : round.opponentCanonicalPairs;
            for (const [a, b] of list) {
                const key = pairKey(a, b);
                pairs.set(key, Math.max(pairs.get(key) ?? 0, weight));
            }
        });
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

/** The band shifted by `offset` places, wrapping around. */
function rotate<T>(band: T[], offset: number): T[] {
    if (band.length === 0) return band;
    const shift = offset % band.length;
    return [...band.slice(shift), ...band.slice(0, shift)];
}

/** Weight of the forbidden pairs found in a split: 0 when none is rebuilt. */
function countForbiddenPairs(groups: string[][], forbiddenPairs: ForbiddenPairs): number {
    let count = 0;
    for (const group of groups) {
        for (let i = 0; i < group.length; i++) {
            for (let j = i + 1; j < group.length; j++) {
                count += forbiddenPairs.get(pairKey(group[i], group[j])) ?? 0;
            }
        }
    }
    return count;
}

/** Descending order that stays defined with Infinity on both sides (Infinity - Infinity is NaN). */
function compareDesc(a: number, b: number): number {
    return a === b ? 0 : a > b ? -1 : 1;
}

function pairKey(a: string, b: string): string {
    return [a, b].sort().join('|');
}

function canonicalOf(participantIds: string[]): string {
    return [...participantIds].sort().join(',');
}
