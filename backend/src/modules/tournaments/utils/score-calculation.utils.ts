import { ScoreCalculation } from 'src/enum/tounament.enum';
import { GlobalRankingEntry } from '../responses/ranking.dto';

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

/**
 * Score de classement d'une entry pour une méthode de calcul donnée, comparable directement
 * par soustraction — pour VICTORY_AND_GOAL_AVERAGE, les victoires sont pondérées pour toujours
 * primer sur le goal average (départage).
 */
export function computeEntryScore(
    entry: Pick<GlobalRankingEntry, 'tournamentPoints' | 'wins' | 'goalAverage' | 'pointsFor'>,
    scoreCalculation: ScoreCalculation,
): number {
    const GOAL_AVERAGE_TIEBREAK_OFFSET = 1_000_000;

    switch (scoreCalculation) {
        case ScoreCalculation.TOURNAMENT_SCORE:
            return entry.tournamentPoints;
        case ScoreCalculation.VICTORY_AND_GOAL_AVERAGE:
            return entry.wins * GOAL_AVERAGE_TIEBREAK_OFFSET + entry.goalAverage;
        default:
        case ScoreCalculation.SCORE:
            return entry.pointsFor;
    }
}
