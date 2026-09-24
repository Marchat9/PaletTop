export interface DecompositionInput {
    /** Joueurs à répartir (hors équipes fixes). */
    soloCount: number;
    /** Équipes fixes qui occuperont une plaque. */
    fixedTeamCount: number;
    playersPerTeam: number;
    allowedTeamSizes: number[];
    preferTargetTeamSize: boolean;
    plateCount: number;
}

export interface Decomposition {
    /** Tailles des équipes à former, de la plus grande à la plus petite. */
    groupSizes: number[];
    /** Équipes fixes retenues : le reste attendra, faute de plaque. */
    fixedTeamsPlaying: number;
    /** Joueurs solos qui ne joueront pas ce round. */
    sitOutCount: number;
}

/**
 * Choisit la répartition des joueurs en équipes, en appliquant les règles dans l'ordre :
 *
 * 1. toute équipe a une taille autorisée ;
 * 2. le nombre total d'équipes est pair, sinon la dernière n'aurait pas d'adversaire ;
 * 3. pas plus de matchs que de plaques disponibles ;
 * 4. l'arbitrage de la séance tranche entre « tout le monde joue » et « garder la taille visée ».
 *
 * Renvoie `null` quand aucun match n'est possible (trois joueurs et des équipes de deux, par
 * exemple) : c'est à l'appelant de l'expliquer, il n'y a rien à générer.
 */
export function chooseDecomposition(input: DecompositionInput): Decomposition | null {
    const sizes = [...new Set([input.playersPerTeam, ...input.allowedTeamSizes])]
        .filter((size) => Number.isInteger(size) && size > 0)
        .sort((a, b) => a - b);
    if (sizes.length === 0 || input.plateCount < 1) {
        return null;
    }

    const maxTeams = input.plateCount * 2;
    const grid = deviationGrid(input.soloCount, sizes, input.playersPerTeam);

    let winner: Decomposition | null = null;
    let winnerScore: [number, number] | null = null;
    let winnerFixedPlaying = -1;

    // Les équipes fixes ont la priorité sur les plaques, mais il faut parfois en laisser une de
    // côté pour que le compte total tombe pair, ou pour tenir dans les plaques disponibles.
    for (
        let fixedPlaying = Math.min(input.fixedTeamCount, maxTeams);
        fixedPlaying >= 0;
        fixedPlaying--
    ) {
        const slots = maxTeams - fixedPlaying;

        for (let count = 0; count < grid.length && count <= slots; count++) {
            if ((fixedPlaying + count) % 2 !== 0 || fixedPlaying + count === 0) continue;

            for (let used = 0; used <= input.soloCount; used++) {
                const cell = grid[count][used];
                if (!cell) continue;

                // Ordre lexicographique : le premier critère dépend de l'arbitrage de la séance,
                // le second départage.
                const score: [number, number] = input.preferTargetTeamSize
                    ? [cell.deviation, -used]
                    : [-used, cell.deviation];

                if (!winnerScore || isBetter(score, winnerScore)) {
                    winnerScore = score;
                    winnerFixedPlaying = fixedPlaying;
                    winner = {
                        groupSizes: [...cell.sizes].sort((a, b) => b - a),
                        fixedTeamsPlaying: fixedPlaying,
                        sitOutCount: input.soloCount - used,
                    };
                }
            }
        }

        // Une équipe fixe de moins ne peut qu'empirer le résultat dès lors qu'on en a déjà trouvé
        // une solution qui les fait toutes jouer.
        if (winnerFixedPlaying === fixedPlaying) break;
    }

    return winner;
}

function isBetter(a: [number, number], b: [number, number]): boolean {
    return a[0] !== b[0] ? a[0] < b[0] : a[1] < b[1];
}

interface Cell {
    deviation: number;
    sizes: number[];
}

/**
 * `grid[count][used]` : la répartition de `used` joueurs en `count` équipes de tailles autorisées
 * qui s'écarte le moins de la taille visée, ou `null` si elle n'existe pas.
 */
function deviationGrid(
    soloCount: number,
    sizes: number[],
    playersPerTeam: number,
): (Cell | null)[][] {
    const maxCount = Math.floor(soloCount / sizes[0]);
    const grid: (Cell | null)[][] = Array.from({ length: maxCount + 1 }, () =>
        Array.from({ length: soloCount + 1 }, () => null),
    );
    grid[0][0] = { deviation: 0, sizes: [] };

    for (let count = 1; count <= maxCount; count++) {
        for (let used = 1; used <= soloCount; used++) {
            for (const size of sizes) {
                if (size > used) continue;
                const previous = grid[count - 1][used - size];
                if (!previous) continue;

                const deviation = previous.deviation + Math.abs(size - playersPerTeam);
                const current = grid[count][used];
                if (!current || deviation < current.deviation) {
                    grid[count][used] = { deviation, sizes: [...previous.sizes, size] };
                }
            }
        }
    }

    return grid;
}
