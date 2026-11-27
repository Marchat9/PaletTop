export enum CompetitionMode {
    STANDARD = 'standard',
    UP_DOWN = 'up_down',
    CHAMPIONSHIP = 'championship',
}
export enum ScoreCalculation {
    VICTORY_GOAL_AVERAGE = 'victory_goal_average',
    VICTORY_BEST_DEFEATS = 'victory_best_defeats',
    VICTORY_POINTS_SCORED = 'victory_points_scored',
    TOURNAMENT_SCORE = 'tournament_score',
}
/** How the up-down rounds after the first one are paired. */
export enum PairingMode {
    /** Every round is drawn. */
    RANDOM = 'random',
    /** Swiss system, Dutch variant: same wins, top half of the group against the bottom half. */
    DUTCH = 'dutch',
    /** Ranking neighbours: 1st against 2nd, 3rd against 4th, within the constraints when possible. */
    NEIGHBORS = 'neighbors',
}
