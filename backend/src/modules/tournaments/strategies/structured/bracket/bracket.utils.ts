import { Team } from 'src/entities/team.entity';
import { shuffleFisherYates } from '../../../utils/global.utils';
import { powerOfTwoCeil } from '../plan/bracket-split';

/**
 * One match of a bracket round, at `position` (0-based, in its round). `teamB` null is a bye:
 * `teamA` goes through without playing.
 */
export interface BracketSlot {
    position: number;
    teamA: Team;
    teamB: Team | null;
}

/** The result of one match of a round, to build the next round from. */
export interface BracketResult {
    position: number;
    /** Null while the match is not finished. */
    winner: Team | null;
}

/**
 * Standard seeding order of a bracket of `size` slots (a power of 2, at least 2): seed 1 and seed 2
 * are in opposite halves, so they can only meet in the final. `order(2) = [1, 2]`, then every
 * position `p` of `order(k)` becomes `[p, 2k + 1 - p]`: `order(8) = [1, 8, 4, 5, 2, 7, 3, 6]`.
 * Slot `p` of the first round holds the seeds `order[2p]` and `order[2p + 1]`.
 */
export function seedingOrder(size: number): number[] {
    if (size < 2 || (size & (size - 1)) !== 0) {
        throw new Error(`A bracket size must be a power of 2, at least 2 (got ${size}).`);
    }
    let order = [1, 2];
    for (let current = 2; current < size; current *= 2) {
        const next = current * 2;
        order = order.flatMap((position) => [position, next + 1 - position]);
    }
    return order;
}

function requireTwoTeams(count: number): void {
    if (count < 2) {
        throw new Error(`A bracket needs at least 2 teams (got ${count}).`);
    }
}

/**
 * First round of a pyramidal bracket. `seededTeams` is best first (seed 1 = index 0). The bracket
 * has `powerOfTwoCeil(n)` slots; a seed above `n` does not exist, so its opponent is exempt: the
 * byes fall on the best seeds. A slot with no team at all is not created.
 */
export function buildPyramidalFirstRound(seededTeams: Team[]): BracketSlot[] {
    requireTwoTeams(seededTeams.length);
    const size = powerOfTwoCeil(seededTeams.length);
    const order = seedingOrder(size);
    const teamOfSeed = (seed: number): Team | null => seededTeams[seed - 1] ?? null;

    const slots: BracketSlot[] = [];
    for (let position = 0; position < size / 2; position++) {
        const first = teamOfSeed(order[2 * position]);
        const second = teamOfSeed(order[2 * position + 1]);
        if (first && second) {
            slots.push({ position, teamA: first, teamB: second });
        } else if (first || second) {
            slots.push({ position, teamA: (first ?? second)!, teamB: null });
        }
    }
    return slots;
}

/**
 * First round of a random bracket: same size as the pyramidal one (`powerOfTwoCeil(n)` slots,
 * `size - n` byes), but the exempt teams are drawn with `random`, the others are paired by
 * `drawPairs` (the constrained draw), and the matches are shuffled over the positions with the
 * same `random`. The teams are put in id order first, so the same seed always gives the same tree.
 */
export function buildRandomFirstRound(
    teams: Team[],
    random: () => number,
    drawPairs: (teams: Team[]) => [Team, Team][],
): BracketSlot[] {
    requireTwoTeams(teams.length);
    const size = powerOfTwoCeil(teams.length);
    const byeCount = size - teams.length;

    const shuffled = shuffleFisherYates(
        [...teams].sort((a, b) => a.id.localeCompare(b.id)),
        random,
    );
    const exempt = shuffled.slice(0, byeCount);
    const playing = shuffled.slice(byeCount);

    const pairs = playing.length ? drawPairs(playing) : [];
    const matches = [
        ...exempt.map((team): Omit<BracketSlot, 'position'> => ({ teamA: team, teamB: null })),
        ...pairs.map(([teamA, teamB]): Omit<BracketSlot, 'position'> => ({ teamA, teamB })),
    ];
    return shuffleFisherYates(matches, random).map((slot, position) => ({ ...slot, position }));
}

/**
 * Next round of a bracket: match `k` holds the winners of positions `2k` and `2k + 1` of the
 * previous round. Throws on a match without winner or on an odd number of matches.
 */
export function nextRoundSlots(previous: BracketResult[]): BracketSlot[] {
    if (previous.length % 2 !== 0) {
        throw new Error(`A round of ${previous.length} matches cannot feed the next one.`);
    }
    const sorted = [...previous].sort((a, b) => a.position - b.position);
    const slots: BracketSlot[] = [];
    for (let k = 0; k < sorted.length / 2; k++) {
        const first = sorted[2 * k].winner;
        const second = sorted[2 * k + 1].winner;
        if (!first || !second) {
            throw new Error(`Match ${2 * k} or ${2 * k + 1} has no winner yet.`);
        }
        slots.push({ position: k, teamA: first, teamB: second });
    }
    return slots;
}
