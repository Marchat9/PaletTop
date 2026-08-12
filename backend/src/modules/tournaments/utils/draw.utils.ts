import { Logger } from '@nestjs/common';
import { Team } from 'src/entities/team.entity';
import { TournamentMatch } from 'src/entities/tounament-match.entity';
import { ConstraintLevel } from 'src/enum/constraint-level.enum';
import { ConstraintConfig } from 'src/model/constraint.model';
import { findMaximumMatching } from 'src/modules/tournaments/utils/algo-blossom.utils';
import { buildConstraintLadder } from 'src/modules/tournaments/utils/constraint.utils';
import { shuffleFisherYates } from 'src/modules/tournaments/utils/global.utils';

export type TeamPair = [Team, Team];

const logger = new Logger('DrawUtils');

// Bounded number of local-search passes for refinePairsForVariety. Each accepted swap
// strictly lowers a non-negative integer cost, so the loop always converges well before
// this cap in practice — it's a defensive backstop, not what makes it terminate.
const MAX_REFINEMENT_ROUNDS = 10;

/**
 * Génère les paires d'équipes pour une session dans une poule.
 * Respecte les contraintes dans l'ordre de priorité et les relâche progressivement
 * si aucune solution complète n'est trouvée.
 */
export function generatePairsWithContraints(
    config: ConstraintConfig,
    teams: Team[],
    pastMatches: TournamentMatch[],
): TeamPair[] {
    // Odd/empty pools can never yield a perfect matching — skip straight to the answer
    // instead of running the constraint ladder for nothing (bye handling stays with the caller).
    if (teams.length < 2 || teams.length % 2 !== 0) return [];

    const startedAt = Date.now();
    logger.debug(
        `generatePairsWithContraints: start — ${teams.length} teams, ${pastMatches.length} past matches`,
    );

    const counts = buildMatchCountMap(pastMatches);
    // Shuffle so tie-breaks between otherwise-equivalent teams aren't biased by array order.
    const shuffledTeams = shuffleFisherYates(teams);

    for (const level of buildConstraintLadder(config)) {
        const pairs = matchTeamsAtLevel(shuffledTeams, counts, level);

        if (pairs !== null) {
            const refined = refinePairsForVariety(pairs, counts, level);
            return refined;
        }
    }
    // Cas impossible (poule vide ou 1 équipe) — ne devrait pas arriver
    logger.debug(
        `generatePairsWithContraints: no level produced a perfect matching (${Date.now() - startedAt} ms)`,
    );
    return [];
}

// Builds the allowed-pairs graph for one constraint level and asks the Blossom matcher
// for a maximum matching. Returns null if no *perfect* matching exists at this level,
// so the caller can fall back to a more permissive level — same contract the old
// backtracking search had, just without any risk of runaway search time.
function matchTeamsAtLevel(
    teams: Team[],
    counts: Map<string, number>,
    level: ConstraintLevel,
): TeamPair[] | null {
    const nbTeam = teams.length;
    const adjacency: boolean[][] = Array.from({ length: nbTeam }, () =>
        new Array<boolean>(nbTeam).fill(false),
    );

    for (let i = 0; i < nbTeam; i++) {
        for (let j = i + 1; j < nbTeam; j++) {
            if (isValidPair(teams[i], teams[j], counts, level)) {
                adjacency[i][j] = true;
                adjacency[j][i] = true;
            }
        }
    }

    const match = findMaximumMatching(nbTeam, adjacency);
    if (match.some((partner) => partner === -1)) return null;

    const pairs: TeamPair[] = [];
    for (let i = 0; i < nbTeam; i++) {
        if (match[i] > i) pairs.push([teams[i], teams[match[i]]]);
    }
    return pairs;
}

// Bounded local search: the Blossom matcher only guarantees a *valid* perfect matching,
// not one that spreads out rematches — this pass swaps two pairs whenever doing so
// strictly lowers the total rematch count, without ever breaking the current
// constraint level. Termination is guaranteed by the round cap above (and, in practice,
// happens much sooner since cost can only decrease).
function refinePairsForVariety(
    pairs: TeamPair[],
    counts: Map<string, number>,
    level: ConstraintLevel,
): TeamPair[] {
    const result = [...pairs];

    for (let round = 0; round < MAX_REFINEMENT_ROUNDS; round++) {
        let improved = false;

        for (let i = 0; i < result.length; i++) {
            for (let j = i + 1; j < result.length; j++) {
                const swap = betterSwap(result[i], result[j], counts, level);
                if (swap !== null) {
                    result[i] = swap[0];
                    result[j] = swap[1];
                    improved = true;
                }
            }
        }

        if (!improved) break;
    }

    return result;
}

// Tries both ways of recombining two pairs (a-b/c-d -> a-c/b-d or a-d/b-c) and returns
// whichever valid recombination has a strictly lower total rematch count, if any.
function betterSwap(
    pairA: TeamPair,
    pairB: TeamPair,
    counts: Map<string, number>,
    level: ConstraintLevel,
): [TeamPair, TeamPair] | null {
    const [a, b] = pairA;
    const [c, d] = pairB;
    const currentCost = matchCount(a, b, counts) + matchCount(c, d, counts);

    const recombinations: [TeamPair, TeamPair][] = [
        [
            [a, c],
            [b, d],
        ],
        [
            [a, d],
            [b, c],
        ],
    ];

    let best: [TeamPair, TeamPair] | null = null;
    let bestCost = currentCost;

    for (const [p1, p2] of recombinations) {
        if (
            !isValidPair(p1[0], p1[1], counts, level) ||
            !isValidPair(p2[0], p2[1], counts, level)
        ) {
            continue;
        }
        const cost = matchCount(p1[0], p1[1], counts) + matchCount(p2[0], p2[1], counts);
        if (cost < bestCost) {
            bestCost = cost;
            best = [p1, p2];
        }
    }

    return best;
}

function isValidPair(
    teamA: Team,
    teamB: Team,
    counts: Map<string, number>,
    level: ConstraintLevel,
): boolean {
    switch (level) {
        case ConstraintLevel.NO_SAME_CLUB:
            return !sameFullClub(teamA, teamB);

        case ConstraintLevel.NO_PARTIAL_SAME_CLUB:
            return !teamsShareClub(teamA, teamB);

        case ConstraintLevel.NO_REMATCH_NO_SAME_CLUB:
            return !sameFullClub(teamA, teamB) && !hasRematch(teamA, teamB, counts);

        case ConstraintLevel.NO_REMATCH_NO_PARTIAL_SAME_CLUB:
            return !teamsShareClub(teamA, teamB) && !hasRematch(teamA, teamB, counts);

        case ConstraintLevel.NO_REMATCH:
            return !hasRematch(teamA, teamB, counts);

        case ConstraintLevel.NO_CONTRAINTE:
        default:
            return true;
    }
}

// Pre-computes a team-pair -> past-encounter-count map once per call, instead of
// re-scanning the full pastMatches array on every matchCount() lookup.
function buildMatchCountMap(pastMatches: TournamentMatch[]): Map<string, number> {
    const counts = new Map<string, number>();
    for (const m of pastMatches) {
        if (!m.teamA?.id || !m.teamB?.id) continue;
        const key = pairKey(m.teamA.id, m.teamB.id);
        counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return counts;
}

function pairKey(idA: string, idB: string): string {
    return idA < idB ? `${idA}|${idB}` : `${idB}|${idA}`;
}

// Nombre de fois où teamA et teamB se sont déjà affrontées.
function matchCount(teamA: Team, teamB: Team, counts: Map<string, number>): number {
    return counts.get(pairKey(teamA.id, teamB.id)) ?? 0;
}

// Vérifie si les équipes ont déjà jouée contre.
function hasRematch(teamA: Team, teamB: Team, counts: Map<string, number>): boolean {
    return matchCount(teamA, teamB, counts) > 0;
}

// Vérifie si au moins un joueur de teamA et un joueur de teamB partagent le même club.
function teamsShareClub(teamA: Team, teamB: Team): boolean {
    const clubsA: Set<string> = new Set(
        teamA.players.filter((p) => !!p.club).map((p) => p.club!.id),
    );
    return teamB.players.some((p) => p.club?.id && clubsA.has(p.club.id));
}

// Une équipe est homogène si tous ses joueurs appartiennent au même club.
function clubIdIfFullSameClub(team: Team): string | null {
    const clubs: string[] = team.players.filter((p) => !!p.club).map((p) => p.club!.id);
    return clubs.length === team.players.length && new Set(clubs).size === 1 ? clubs[0] : null;
}

// Vérifie si teamA et teamB sont toutes les deux homogènes et appartiennent au même club.
// Deux équipes non-homogènes (ou sans club) ne sont jamais considérées "du même club".
function sameFullClub(teamA: Team, teamB: Team): boolean {
    const clubA = clubIdIfFullSameClub(teamA);
    const clubB = clubIdIfFullSameClub(teamB);
    return clubA !== null && clubB !== null && clubA === clubB;
}
