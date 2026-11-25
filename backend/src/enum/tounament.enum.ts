export enum CompetitionMode {
    STANDARD = 'standard',
    UP_DOWN = 'up_down',
    CHAMPIONSHIP = 'championship',
}
export enum ScoreCalculation {
    VICTORY_AND_GOAL_AVERAGE = 'victory_ga',
    SCORE = 'score',
    TOURNAMENT_SCORE = 'tournament_score',
    VICTORY_BUCHHOLZ_GOAL_AVERAGE = 'victory_buchholz_ga',
    SCORE_BUCHHOLZ_GOAL_AVERAGE = 'score_buchholz_ga',
}
/** How the up-down rounds after the first one are paired. */
export enum PairingMode {
    /** Every round is drawn. */
    RANDOM = 'random',
    /** Swiss system, Dutch variant: same wins, top half of the group against the bottom half. */
    DUTCH = 'dutch',
}
