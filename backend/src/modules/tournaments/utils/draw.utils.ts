import { Team } from 'src/entities/team.entity';
import { TournamentMatch } from 'src/entities/tounament-match.entity';
import { ConstraintLevel } from 'src/enum/constraint-level.enum';
import { ConstraintConfig } from 'src/model/constraint.model';
import { buildConstraintLadder } from 'src/modules/tournaments/utils/constraint.utils';
import { shuffleFisherYates } from 'src/modules/tournaments/utils/global.utils';

export type TeamPair = [Team, Team];

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
    for (const level of buildConstraintLadder(config)) {
        const result = recursiveGeneratePair([...teams], [], pastMatches, level);
        if (result !== null) {
            return result;
        }
    }
    // Cas impossible (poule vide ou 1 équipe) — ne devrait pas arriver
    return [];
}

// Backtracking : fixe la première équipe libre et cherche un adversaire valide,
// en essayant en priorité les équipes contre qui elle a le moins joué (pour varier
// les adversaires une fois que les contraintes anti-revanche ne discriminent plus).
// Retourne null si aucune solution n'existe à ce niveau de contrainte.
function recursiveGeneratePair(
    remaining: Team[],
    pairs: TeamPair[],
    pastMatches: TournamentMatch[],
    level: ConstraintLevel,
): TeamPair[] | null {
    if (remaining.length === 0) return pairs;

    const [first, ...rest] = remaining;
    const candidates = shuffleFisherYates(rest).sort(
        (a, b) => matchCount(first, a, pastMatches) - matchCount(first, b, pastMatches),
    );

    for (const opponent of candidates) {
        if (isValidPair(first, opponent, pastMatches, level)) {
            const remainingTeams = candidates.filter((team) => team.id !== opponent.id);
            const newPairs: TeamPair[] = [...pairs, [first, opponent]];

            const result = recursiveGeneratePair(remainingTeams, newPairs, pastMatches, level);

            if (result !== null) return result;
        }
    }

    return null;
}

function isValidPair(
    teamA: Team,
    teamB: Team,
    pastMatches: TournamentMatch[],
    level: ConstraintLevel,
): boolean {
    switch (level) {
        case ConstraintLevel.NO_SAME_CLUB:
            return !sameFullClub(teamA, teamB);

        case ConstraintLevel.NO_PARTIAL_SAME_CLUB:
            return !teamsShareClub(teamA, teamB);

        case ConstraintLevel.NO_REMATCH_NO_SAME_CLUB:
            return !sameFullClub(teamA, teamB) && !hasRematch(teamA, teamB, pastMatches);

        case ConstraintLevel.NO_REMATCH_NO_PARTIAL_SAME_CLUB:
            return !teamsShareClub(teamA, teamB) && !hasRematch(teamA, teamB, pastMatches);

        case ConstraintLevel.NO_REMATCH:
            return !hasRematch(teamA, teamB, pastMatches);

        case ConstraintLevel.NO_CONTRAINTE:
        default:
            return true;
    }
}

// Nombre de fois où teamA et teamB se sont déjà affrontées.
function matchCount(teamA: Team, teamB: Team, pastMatches: TournamentMatch[]): number {
    return pastMatches.filter(
        (m) =>
            (m.teamA?.id === teamA.id && m.teamB?.id === teamB.id) ||
            (m.teamA?.id === teamB.id && m.teamB?.id === teamA.id),
    ).length;
}

// Vérifie si les équipes ont déjà jouée contre.
function hasRematch(teamA: Team, teamB: Team, pastMatches: TournamentMatch[]): boolean {
    return matchCount(teamA, teamB, pastMatches) > 0;
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
