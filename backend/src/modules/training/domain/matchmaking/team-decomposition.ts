export interface DecompositionInput {
    /** Players to split (fixed teams excluded). */
    soloCount: number;
    /** Fixed teams that will take a plate. */
    fixedTeamCount: number;
    playersPerTeam: number;
    allowedTeamSizes: number[];
    preferTargetTeamSize: boolean;
    plateCount: number;
}

export interface Decomposition {
    /** Sizes of the teams to build, largest first. */
    groupSizes: number[];
    /** Fixed teams kept: the others will wait, for lack of a plate. */
    fixedTeamsPlaying: number;
    /** Joueurs solos qui ne joueront pas ce round. */
    sitOutCount: number;
}

/**
 * Chooses how the players are split into teams, applying the rules in order:
 *
 * 1. every team has an allowed size; 2. the total number of teams is even, otherwise the last one
 * has no opponent; 3. no more matches than available plates; 4. the session trade-off decides
 * between "everyone plays" and "keep the target size".
 *
 * Returns `null` when no match is possible (three players with teams of two, for instance): it is
 * up to the caller to explain it, there is nothing to generate.
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

    // Fixed teams come first for the plates, but one sometimes has to be left out so the total
    // count is even, or to fit in the available plates.
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

                // Lexicographic order: the first criterion depends on the session trade-off, the
                // second one breaks ties.
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

        // One fixed team less can only make things worse once a solution that makes them all play
        // has been found.
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
 * `grid[count][used]`: the split of `used` players into `count` teams of allowed sizes that strays
 * least from the target size, or `null` when it does not exist.
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
