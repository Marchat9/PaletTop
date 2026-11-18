import { Team } from 'src/entities/team.entity';
import { TournamentMatch } from 'src/entities/tounament-match.entity';
import { ConstraintLevel } from 'src/enum/constraint-level.enum';
import { ConstraintConfig } from 'src/model/constraint.model';
import {
    buildMatchCountMap,
    isValidPair,
    TeamPair,
} from 'src/modules/tournaments/utils/draw.utils';

/**
 * Number of explored nodes allowed per constraint level before relaxing to the next one. A
 * solution is usually found right away; the budget only bounds the rare dead ends.
 */
const SEARCH_BUDGET_PER_LEVEL = 50_000;

/** Pairs of a round, plus the team left out (odd count), if any. */
export interface PairingResult {
    pairs: TeamPair[];
    byeTeam: Team | null;
}

/** Preferred opponents of each team, best first. */
type Preferences = Map<string, Team[]>;

/**
 * The team that sits out: the lowest-ranked one among those with the fewest byes, so a team never
 * gets a second bye while another one never had any.
 */
export function selectDutchByeTeam(
    rankedTeams: Team[],
    pastMatches: TournamentMatch[],
): Team | null {
    if (rankedTeams.length % 2 === 0) return null;
    const byeCount = new Map<string, number>(rankedTeams.map((team) => [team.id, 0]));
    for (const match of pastMatches) {
        if (match.isBye && byeCount.has(match.teamA.id)) {
            byeCount.set(match.teamA.id, byeCount.get(match.teamA.id)! + 1);
        }
    }
    const fewest = Math.min(...byeCount.values());
    return [...rankedTeams].reverse().find((team) => byeCount.get(team.id) === fewest) ?? null;
}

/** Score groups: teams with the same number of wins, most wins first, ranking order inside. */
export function buildScoreGroups(rankedTeams: Team[], winsByTeam: Map<string, number>): Team[][] {
    const groups = new Map<number, Team[]>();
    for (const team of rankedTeams) {
        const wins = winsByTeam.get(team.id) ?? 0;
        groups.set(wins, [...(groups.get(wins) ?? []), team]);
    }
    return [...groups.entries()].sort(([a], [b]) => b - a).map(([, teams]) => teams);
}

/** `items` sorted by distance to `index` (closest first), the item at `index` excluded. */
function byDistance(items: Team[], index: number): Team[] {
    return items
        .map((team, i) => ({ team, distance: Math.abs(i - index) }))
        .filter((_, i) => i !== index)
        .sort((a, b) => a.distance - b.distance)
        .map(({ team }) => team);
}

/**
 * Dutch preferences: inside a score group, the top half plays the bottom half (1v5, 2v6… in a
 * group of 8); the other teams of the group come next, then the lower groups (a team floats down),
 * then the upper ones. With an odd group, the lowest team of the group floats down first.
 */
export function buildDutchPreferences(groups: Team[][]): Preferences {
    const preferences: Preferences = new Map();

    groups.forEach((group, groupIndex) => {
        const lower = groups.slice(groupIndex + 1).flat();
        const upper = groups.slice(0, groupIndex).flat().reverse();
        const half = Math.floor(group.length / 2);
        const topHalf = group.slice(0, half);
        const bottomHalf = group.slice(half, 2 * half);
        const floater = group.length % 2 === 1 ? group[group.length - 1] : null;

        topHalf.forEach((team, i) => {
            preferences.set(team.id, [
                bottomHalf[i],
                ...byDistance(bottomHalf, i),
                ...byDistance(topHalf, i),
                ...(floater ? [floater] : []),
                ...lower,
                ...upper,
            ]);
        });
        bottomHalf.forEach((team, i) => {
            preferences.set(team.id, [
                topHalf[i],
                ...byDistance(topHalf, i),
                ...byDistance(bottomHalf, i),
                ...(floater ? [floater] : []),
                ...lower,
                ...upper,
            ]);
        });
        if (floater) {
            preferences.set(floater.id, [...lower, ...[...group].reverse().slice(1), ...upper]);
        }
    });

    return preferences;
}

/** Every other team, closest in the ranking first (ranking-based last round). */
export function buildNeighbourPreferences(rankedTeams: Team[]): Preferences {
    return new Map(rankedTeams.map((team, i) => [team.id, byDistance(rankedTeams, i)]));
}

/**
 * Depth-first search, highest-ranked unpaired team first, trying its opponents in preference
 * order: the first complete solution is the most preferred one. Null when none exists within the
 * budget.
 */
function searchPairs(
    rankedTeams: Team[],
    preferences: Preferences,
    isAllowed: (a: Team, b: Team) => boolean,
): TeamPair[] | null {
    const paired = new Set<string>();
    const pairs: TeamPair[] = [];
    let budget = SEARCH_BUDGET_PER_LEVEL;

    const search = (): boolean => {
        const team = rankedTeams.find((t) => !paired.has(t.id));
        if (!team) return true;
        paired.add(team.id);
        for (const opponent of preferences.get(team.id) ?? []) {
            if (paired.has(opponent.id) || !isAllowed(team, opponent)) continue;
            if (--budget < 0) break;
            paired.add(opponent.id);
            pairs.push([team, opponent]);
            if (search()) return true;
            pairs.pop();
            paired.delete(opponent.id);
        }
        paired.delete(team.id);
        return false;
    };

    return search() ? pairs : null;
}

/** Club constraint of the tournament, combined with "no rematch". */
function strictestLevel(config: ConstraintConfig): ConstraintLevel {
    if (!config.allowMatchAgainstPartialSameClub) {
        return ConstraintLevel.NO_REMATCH_NO_PARTIAL_SAME_CLUB;
    }
    if (!config.allowMatchAgainstFullSameClub) return ConstraintLevel.NO_REMATCH_NO_SAME_CLUB;
    return ConstraintLevel.NO_REMATCH;
}

/**
 * Tries the levels from the strictest; the last one has no constraint and always succeeds (the
 * preference order then still keeps rematches as rare as it can).
 */
function pairAtFirstPossibleLevel(
    rankedTeams: Team[],
    preferences: Preferences,
    levels: ConstraintLevel[],
    pastMatches: TournamentMatch[],
): TeamPair[] {
    const counts = buildMatchCountMap(pastMatches);
    for (const level of [...new Set(levels)]) {
        const pairs = searchPairs(rankedTeams, preferences, (a, b) =>
            isValidPair(a, b, counts, level),
        );
        if (pairs) return pairs;
    }
    return [];
}

/**
 * Swiss system, Dutch variant: teams with the same number of wins meet, top half against bottom
 * half, without rematch when possible (club constraints are relaxed before rematches).
 * `rankedTeams` follows the current ranking; `winsByTeam` gives the groups, whatever the score
 * calculation.
 */
export function generateDutchPairs(
    rankedTeams: Team[],
    winsByTeam: Map<string, number>,
    pastMatches: TournamentMatch[],
    config: ConstraintConfig,
): PairingResult {
    const byeTeam = selectDutchByeTeam(rankedTeams, pastMatches);
    const playing = rankedTeams.filter((team) => team.id !== byeTeam?.id);
    const preferences = buildDutchPreferences(buildScoreGroups(playing, winsByTeam));
    const pairs = pairAtFirstPossibleLevel(
        playing,
        preferences,
        [strictestLevel(config), ConstraintLevel.NO_REMATCH, ConstraintLevel.NO_CONTRAINTE],
        pastMatches,
    );
    return { pairs, byeTeam };
}

/**
 * Ranking-based last round of the Dutch mode: each team meets its closest ranking neighbour it has
 * not met yet. The last-ranked team sits out with an odd count (bye worth nothing).
 */
export function generateNeighbourPairs(
    rankedTeams: Team[],
    pastMatches: TournamentMatch[],
): PairingResult {
    const byeTeam = rankedTeams.length % 2 === 1 ? rankedTeams[rankedTeams.length - 1] : null;
    const playing = rankedTeams.filter((team) => team.id !== byeTeam?.id);
    const pairs = pairAtFirstPossibleLevel(
        playing,
        buildNeighbourPreferences(playing),
        [ConstraintLevel.NO_REMATCH, ConstraintLevel.NO_CONTRAINTE],
        pastMatches,
    );
    return { pairs, byeTeam };
}
