/**
 * Ce que donnerait un round pour un effectif donné, avant même de le générer.
 *
 * Reprend les règles de répartition du serveur (`team-decomposition.ts` côté backend) : toute
 * équipe a une taille autorisée, le nombre d'équipes est pair, on ne dépasse pas les plaques,
 * et l'arbitrage de la séance tranche entre « tout le monde joue » et « garder la taille visée ».
 * Les deux implémentations sont couvertes par les mêmes cas de test : si l'une dérive, l'autre
 * le signale.
 */
export interface RoundPreviewSettings {
  playersPerTeam: number;
  allowedTeamSizes: number[];
  preferTargetTeamSize: boolean;
  plateCount: number;
}

export interface RoundPreview {
  /** Tailles des équipes qui joueraient, de la plus grande à la plus petite. */
  teamSizes: number[];
  matchCount: number;
  sitOutCount: number;
}

export function previewRound(
  headcount: number,
  settings: RoundPreviewSettings,
): RoundPreview | null {
  const sizes = [...new Set([settings.playersPerTeam, ...settings.allowedTeamSizes])]
    .filter((size) => Number.isInteger(size) && size > 0)
    .sort((a, b) => a - b);
  if (sizes.length === 0 || settings.plateCount < 1 || headcount < 1) {
    return null;
  }

  const maxTeams = settings.plateCount * 2;
  const grid = deviationGrid(headcount, sizes, settings.playersPerTeam);

  let winner: RoundPreview | null = null;
  let winnerScore: [number, number] | null = null;

  for (let count = 0; count < grid.length && count <= maxTeams; count++) {
    if (count % 2 !== 0 || count === 0) {
      continue;
    }

    for (let used = 0; used <= headcount; used++) {
      const cell = grid[count][used];
      if (!cell) {
        continue;
      }

      const score: [number, number] = settings.preferTargetTeamSize
        ? [cell.deviation, -used]
        : [-used, cell.deviation];

      if (
        !winnerScore ||
        score[0] < winnerScore[0] ||
        (score[0] === winnerScore[0] && score[1] < winnerScore[1])
      ) {
        winnerScore = score;
        winner = {
          teamSizes: [...cell.sizes].sort((a, b) => b - a),
          matchCount: count / 2,
          sitOutCount: headcount - used,
        };
      }
    }
  }

  return winner;
}

/** Formule le résultat en une phrase, ou explique pourquoi aucun match n'est possible. */
export function describeRoundPreview(
  headcount: number,
  settings: RoundPreviewSettings,
  audience: 'roster' | 'present',
): string {
  const who =
    audience === 'roster'
      ? `Avec vos ${headcount} membres`
      : `Avec ${headcount} ${headcount > 1 ? 'joueurs présents' : 'joueur présent'}`;

  const preview = previewRound(headcount, settings);
  if (!preview) {
    const sizes = [...new Set([settings.playersPerTeam, ...settings.allowedTeamSizes])].sort(
      (a, b) => a - b,
    );
    return (
      `${who} et des équipes de ${sizes.join(' ou ')}, aucun match n'est possible. ` +
      `Autorisez d'autres tailles d'équipe, ou attendez un joueur de plus.`
    );
  }

  const matches = `${preview.matchCount} ${preview.matchCount > 1 ? 'matchs' : 'match'}`;
  const detail = formatMatchups(preview.teamSizes);
  const rest = preview.sitOutCount === 0 ? 'personne au repos' : `${preview.sitOutCount} au repos`;

  return `${who}, ces réglages donneraient ${matches} (${detail}) et ${rest}.`;
}

/** « 2v2, 1v1 » : les équipes sont appariées dans l'ordre où elles sont formées. */
function formatMatchups(teamSizes: number[]): string {
  const matchups: string[] = [];
  for (let index = 0; index + 1 < teamSizes.length; index += 2) {
    matchups.push(`${teamSizes[index]}v${teamSizes[index + 1]}`);
  }
  return matchups.join(', ');
}

interface Cell {
  deviation: number;
  sizes: number[];
}

function deviationGrid(
  headcount: number,
  sizes: number[],
  playersPerTeam: number,
): (Cell | null)[][] {
  const maxCount = Math.floor(headcount / sizes[0]);
  const grid: (Cell | null)[][] = Array.from({ length: maxCount + 1 }, () =>
    Array.from({ length: headcount + 1 }, () => null),
  );
  grid[0][0] = { deviation: 0, sizes: [] };

  for (let count = 1; count <= maxCount; count++) {
    for (let used = 1; used <= headcount; used++) {
      for (const size of sizes) {
        if (size > used) {
          continue;
        }
        const previous = grid[count - 1][used - size];
        if (!previous) {
          continue;
        }

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
