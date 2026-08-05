import { TournamentMatch } from 'src/entities/tounament-match.entity';

// Assigne les numéros de plaque séquentiellement (1, 2, 3…) aux matchs non-bye.
// Prérequis : le nombre de matchs non-bye doit être ≤ numberOfPlaques (garanti par la configuration).
export function assignPlateNumbers(newMatches: TournamentMatch[], numberOfPlaques: number): void {
    let plate = 1;

    for (const match of newMatches) {
        if (match.isBye) continue;
        if (plate > numberOfPlaques) {
            throw new Error(
                `Impossible d'attribuer les plaques : ${newMatches.filter((m) => !m.isBye).length} matchs pour ${numberOfPlaques} plaques disponibles.`,
            );
        }
        match.plateNumber = plate++;
    }
}
