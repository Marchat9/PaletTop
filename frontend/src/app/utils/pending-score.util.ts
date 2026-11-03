import { Nullable } from 'src/app/models/nullable.model';

interface ScoredMatch {
  id: string;
  scoreA: number;
  scoreB: number;
}

interface PendingScore {
  matchId: string;
  scoreA: number;
  scoreB: number;
}

/**
 * The match as the player should see it: with the score they typed during a network outage, not
 * yet saved. Without it, a reload on reconnection would put the card back to the old score.
 */
export function withPendingScore<T extends ScoredMatch>(
  match: Nullable<T>,
  pending: Nullable<PendingScore>,
): Nullable<T> {
  if (!match || !pending || pending.matchId !== match.id) {
    return match;
  }
  return { ...match, scoreA: pending.scoreA, scoreB: pending.scoreB };
}
