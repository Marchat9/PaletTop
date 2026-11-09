import { ConflictException, Logger } from '@nestjs/common';

/** Score a player's entry is based on: the last one the server confirmed to them. */
export interface ExpectedScore {
    scoreA: number;
    scoreB: number;
}

/**
 * Both previous scores, or none: an older client sends none and its score is written as before,
 * without the stale check.
 */
export function toExpectedScore(
    previousScoreA: number | undefined,
    previousScoreB: number | undefined,
): ExpectedScore | null {
    if (previousScoreA === undefined || previousScoreB === undefined) {
        return null;
    }
    return { scoreA: previousScoreA, scoreB: previousScoreB };
}

export function isSameScore(match: ExpectedScore, expected: ExpectedScore): boolean {
    return match.scoreA === expected.scoreA && match.scoreB === expected.scoreB;
}

/**
 * The score changed since the player last saw it (the opponent scored meanwhile, while this
 * player's realtime was down): writing it would erase the other one's points.
 */
export function staleScoreError(
    logger: Logger,
    matchId: string,
    context: string,
): ConflictException {
    logger.warn(`Stale score refused for match ${matchId} (${context})`);
    return new ConflictException('Le score a été modifié depuis un autre appareil.');
}
