const TOURNAMENT_SCORE_WIN_POINTS = 6;

const TOURNAMENT_SCORE_LOSS_BANDS: ReadonlyArray<{
    min: number;
    max: number;
    points: number;
}> = [
    { min: 11, max: 12, points: 4 },
    { min: 9, max: 10, points: 3 },
    { min: 6, max: 8, points: 2 },
    { min: 3, max: 5, points: 1 },
    { min: 0, max: 2, points: 0 },
];

/**
 * "Point tournoi" scoring: a win always gives the flat win value; a loss gives points
 * based on the losing team's own score band (fixed bands, not scaled by pointsPerGame).
 */
export function computeTournamentScorePoints(won: boolean, ownScore: number): number {
    if (won) {
        return TOURNAMENT_SCORE_WIN_POINTS;
    }

    const matchingBand = TOURNAMENT_SCORE_LOSS_BANDS.find(
        (band) => ownScore >= band.min && ownScore <= band.max,
    );
    return matchingBand?.points ?? 0;
}
