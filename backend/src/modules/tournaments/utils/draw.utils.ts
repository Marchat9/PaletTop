import { Team } from 'src/entities/team.entity';
import { TournamentMatch } from 'src/entities/tounament-match.entity';

export type TeamPair = [Team, Team];

enum ConstraintLevel {
    NO_SAME_CLUB, // interdit : tous appartiennent au même club
    NO_PARTIAL_SAME_CLUB, // interdit : une partie des membres appartiennent au même club
    NO_REMATCH_NO_SAME_CLUB, // interdit : rematch + tous appartiennent au même club
    NO_REMATCH_NO_PARTIAL_SAME_CLUB, // interdit : rematch + une partie des membres appartiennent au même club
    NO_REMATCH, // interdit : rematch uniquement
    NO_CONTRAINTE, // aucune contrainte
}

export interface ConstraintConfig {
    allowMatchAgainstFullSameClub: boolean;
    allowMatchAgainstPartialSameClub: boolean;
    allowRematch: boolean;
}

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
    const constraintsLevel = [
        ...(!config.allowMatchAgainstFullSameClub && !config.allowRematch
            ? []
            : [ConstraintLevel.NO_SAME_CLUB]),
        ...(!config.allowMatchAgainstPartialSameClub && !config.allowRematch
            ? []
            : [ConstraintLevel.NO_PARTIAL_SAME_CLUB]),
        ...(!config.allowMatchAgainstFullSameClub && config.allowRematch
            ? []
            : [ConstraintLevel.NO_REMATCH_NO_SAME_CLUB]),
        ...(!config.allowMatchAgainstPartialSameClub && config.allowRematch
            ? []
            : [ConstraintLevel.NO_REMATCH_NO_PARTIAL_SAME_CLUB]),
        ...(config.allowRematch ? [] : [ConstraintLevel.NO_REMATCH]),
        ConstraintLevel.NO_CONTRAINTE,
    ];

    for (const level of constraintsLevel) {
        const result = recursiveGeneratePair([...teams], [], pastMatches, level);
        if (result !== null) {
            return result;
        }
    }
    // Cas impossible (poule vide ou 1 équipe) — ne devrait pas arriver
    return [];
}

// Backtracking : fixe la première équipe libre et cherche un adversaire valide.
// Retourne null si aucune solution n'existe à ce niveau de contrainte.
function recursiveGeneratePair(
    remaining: Team[],
    pairs: TeamPair[],
    pastMatches: TournamentMatch[],
    level: ConstraintLevel,
): TeamPair[] | null {
    if (remaining.length === 0) return pairs;

    const [first, ...rest] = remaining;

    for (let i = 0; i < rest.length; i++) {
        const opponent = rest[i];

        if (isValidPair(first, opponent, pastMatches, level)) {
            const remainingTeams = rest.filter((team) => team.id !== opponent.id);
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
            return clubIdIfFullSameClub(teamA) !== clubIdIfFullSameClub(teamB);

        case ConstraintLevel.NO_PARTIAL_SAME_CLUB:
            return !teamsShareClub(teamA, teamB);

        case ConstraintLevel.NO_REMATCH_NO_SAME_CLUB:
            return (
                clubIdIfFullSameClub(teamA) !== clubIdIfFullSameClub(teamB) &&
                !hasRematch(teamA, teamB, pastMatches)
            );

        case ConstraintLevel.NO_REMATCH_NO_PARTIAL_SAME_CLUB:
            return !teamsShareClub(teamA, teamB) && !hasRematch(teamA, teamB, pastMatches);

        case ConstraintLevel.NO_REMATCH:
            return !hasRematch(teamA, teamB, pastMatches);

        case ConstraintLevel.NO_CONTRAINTE:
        default:
            return true;
    }
}

// Vérifie si les équipes ont déjà jouée contre.
function hasRematch(teamA: Team, teamB: Team, pastMatches: TournamentMatch[]): boolean {
    return pastMatches.some(
        (m) =>
            (m.teamA?.id === teamA.id && m.teamB?.id === teamB.id) ||
            (m.teamA?.id === teamB.id && m.teamB?.id === teamA.id),
    );
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
