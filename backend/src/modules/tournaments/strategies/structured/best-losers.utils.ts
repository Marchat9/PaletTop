import { Team } from 'src/entities/team.entity';
import { TournamentMatch } from 'src/entities/tounament-match.entity';
import { GlobalRankingEntry } from '../../responses/ranking.dto';

/** A team that lost a match, candidate to be brought back as one of the best losers. */
export interface LoserCandidate {
    team: Team;
    lostMatch: TournamentMatch;
}

/** What the best losers ranking reads besides the lost matches. */
export interface BestLoserContext {
    /** Cumulative ranking with the tournament's score calculation, qualifying included. */
    globalRanking: GlobalRankingEntry[];
    pastMatches: TournamentMatch[];
    random: () => number;
}

/** Negative when `a` is the better loser. */
export type LoserComparator = (a: LoserCandidate, b: LoserCandidate) => number;

/** Goal average of `teamId` in `match`: its own score minus its opponent's. */
export function goalAverageOf(match: TournamentMatch, teamId: string): number {
    return match.teamA.id === teamId ? match.scoreA - match.scoreB : match.scoreB - match.scoreA;
}

/** The first comparator that splits the two candidates decides. */
export function chainComparators(...comparators: LoserComparator[]): LoserComparator {
    return (a, b) => {
        for (const compare of comparators) {
            const result = compare(a, b);
            if (result !== 0) return result;
        }
        return 0;
    };
}

/** (1) Higher goal average of the lost match first. */
export const byLostMatchGoalAverage: LoserComparator = (a, b) =>
    goalAverageOf(b.lostMatch, b.team.id) - goalAverageOf(a.lostMatch, a.team.id);

/** (2) Better rank in the cumulative ranking first; teams missing from it come last. */
export function byGlobalRanking(ranking: GlobalRankingEntry[]): LoserComparator {
    const rankOf = new Map(ranking.map((entry) => [entry.teamId, entry.rank]));
    const rank = (candidate: LoserCandidate): number =>
        rankOf.get(candidate.team.id) ?? Number.MAX_SAFE_INTEGER;
    return (a, b) => rank(a) - rank(b);
}

/** Goal averages of the team's matches played before `lostMatch`, the latest first (byes skipped). */
function previousGoalAverages(candidate: LoserCandidate, pastMatches: TournamentMatch[]): number[] {
    const teamId = candidate.team.id;
    const before = candidate.lostMatch.sessionNumber ?? 0;
    return pastMatches
        .filter(
            (m) =>
                !m.isBye &&
                !!m.teamB &&
                (m.sessionNumber ?? 0) < before &&
                (m.teamA.id === teamId || m.teamB.id === teamId),
        )
        .sort((x, y) => (y.sessionNumber ?? 0) - (x.sessionNumber ?? 0))
        .map((m) => goalAverageOf(m, teamId));
}

/**
 * (3) Goal average of the previous match, then of the one before, and so on. A team with no match
 * left at some step is not split by that step (the walk goes on while either has matches).
 */
export function byPreviousGoalAverages(pastMatches: TournamentMatch[]): LoserComparator {
    const cache = new Map<string, number[]>();
    const history = (candidate: LoserCandidate): number[] => {
        let averages = cache.get(candidate.team.id);
        if (!averages) {
            averages = previousGoalAverages(candidate, pastMatches);
            cache.set(candidate.team.id, averages);
        }
        return averages;
    };
    return (a, b) => {
        const historyA = history(a);
        const historyB = history(b);
        const steps = Math.min(historyA.length, historyB.length);
        for (let i = 0; i < steps; i++) {
            if (historyA[i] !== historyB[i]) return historyB[i] - historyA[i];
        }
        return 0;
    };
}

/** (4) Random draw: one lot per candidate, drawn once so that the order stays consistent. */
export function byRandomDraw(candidates: LoserCandidate[], random: () => number): LoserComparator {
    const lots = new Map(candidates.map((candidate) => [candidate.team.id, random()]));
    return (a, b) => lots.get(a.team.id)! - lots.get(b.team.id)!;
}

/**
 * Losers ranked best first: goal average of the lost match, cumulative ranking, goal averages of
 * the previous matches walking back, then a random draw.
 */
export function rankBestLosers(losers: LoserCandidate[], ctx: BestLoserContext): Team[] {
    const compare = chainComparators(
        byLostMatchGoalAverage,
        byGlobalRanking(ctx.globalRanking),
        byPreviousGoalAverages(ctx.pastMatches),
        byRandomDraw(losers, ctx.random),
    );
    return [...losers].sort(compare).map((candidate) => candidate.team);
}
