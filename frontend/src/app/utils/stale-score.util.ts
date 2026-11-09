import { HttpErrorResponse } from '@angular/common/http';
import { Nullable } from 'src/app/models/nullable.model';
import { addNotification } from 'src/app/store/app-config/app-config.actions';
import { newId } from './unique-id.util';

/** Score a player's entry is based on: the last one the server confirmed to them. */
export interface ExpectedScore {
  scoreA: number;
  scoreB: number;
}

interface ScoredMatch {
  id: string;
  scoreA: number;
  scoreB: number;
}

/** The match on screen gives the base of the entry, provided it is the one being scored. */
export function expectedScoreOf(
  match: Nullable<ScoredMatch>,
  matchId: string,
): Nullable<ExpectedScore> {
  return match?.id === matchId ? { scoreA: match.scoreA, scoreB: match.scoreB } : null;
}

/** Body fields of the stale check: none when the base is unknown (the server then writes as is). */
export function previousScoreBody(previous: Nullable<ExpectedScore>) {
  return previous ? { previousScoreA: previous.scoreA, previousScoreB: previous.scoreB } : {};
}

/** Refused by the server: the opponent changed the score since this player last saw it. */
export function isStaleScoreError(error: unknown): boolean {
  return error instanceof HttpErrorResponse && error.status === 409;
}

export function staleScoreNotification() {
  return addNotification({
    notification: {
      id: newId(),
      message: 'Le score a été modifié depuis un autre appareil : il a été rechargé.',
      typeIcon: 'warning',
      type: 'Score',
      createdAt: Date.now(),
    },
  });
}
