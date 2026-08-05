export enum CompetitionMode {
    STANDARD = 'standard',
    UP_DOWN = 'up_down',
    CHAMPIONSHIP = 'championship',
}
export enum ScoreCalculation {
    VICTORY_AND_GOAL_AVERAGE = 'victory_ga',
    SCORE = 'score',
    TOURNAMENT_SCORE = 'tournament_score',
}
export enum EliminationTableau {
    PRINCIPALE = 'principale',
    CONSOLANTE = 'consolante',
    CHALLENGE = 'challenge',
    CHALLENGE_CONSOLANTE = 'challenge_consolante',
}

export enum MatchGroupKey {
    PRINCIPALE = 'principale',
    THIRD_PLACE_MATCH = 'third_place_match',
    CHALLENGE = 'challenge',
    CONSOLANTE = 'consolante',
    CHALLENGE_CONSOLANTE = 'challenge_consolante',
}

export const MATCH_GROUP_ORDER: Record<MatchGroupKey, number> = {
    [MatchGroupKey.PRINCIPALE]: 1,
    [MatchGroupKey.THIRD_PLACE_MATCH]: 2,
    [MatchGroupKey.CHALLENGE]: 3,
    [MatchGroupKey.CONSOLANTE]: 4,
    [MatchGroupKey.CHALLENGE_CONSOLANTE]: 5,
};
