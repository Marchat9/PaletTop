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

export const STALE_SCORE_MESSAGE =
  'Le score a été modifié depuis un autre appareil : il a été rechargé.';
export const STALE_VALIDATION_MESSAGE =
  'Le score a changé depuis un autre appareil : vérifiez-le avant de valider.';

export function staleScoreNotification(message = STALE_SCORE_MESSAGE) {
  return addNotification({
    notification: {
      id: newId(),
      message,
      typeIcon: 'warning',
      type: 'Score',
      createdAt: Date.now(),
    },
  });
}

interface ScoreEntry {
  matchId: string;
  scoreA: number;
  scoreB: number;
}

/**
 * Base of a player's score entry: the score on screen at the first click of a burst of clicks.
 * Read when the grouped request leaves instead, it could already include the opponent's point
 * received meanwhile, and the entry erased it without the server noticing.
 */
export class ScoreEntryBase {
  /** Base of the burst being typed, kept for its later clicks. */
  private burst: Nullable<{ matchId: string; base: Nullable<ExpectedScore> }> = null;
  /** Last score sent and not answered yet: the next burst starts from it, not from the screen. */
  private unanswered: Nullable<ScoreEntry> = null;

  public atClick(matchId: string, onScreen: Nullable<ScoredMatch>): Nullable<ExpectedScore> {
    if (this.burst?.matchId !== matchId) {
      const base =
        this.unanswered?.matchId === matchId
          ? { scoreA: this.unanswered.scoreA, scoreB: this.unanswered.scoreB }
          : expectedScoreOf(onScreen, matchId);
      this.burst = { matchId, base };
    }
    return this.burst.base;
  }

  /** The burst is grouped into one request: the next click starts a new one. */
  public sent(entry: ScoreEntry): void {
    this.burst = null;
    this.unanswered = { matchId: entry.matchId, scoreA: entry.scoreA, scoreB: entry.scoreB };
  }

  public answered(entry: ScoreEntry): void {
    if (
      this.unanswered?.matchId === entry.matchId &&
      this.unanswered.scoreA === entry.scoreA &&
      this.unanswered.scoreB === entry.scoreB
    ) {
      this.unanswered = null;
    }
  }
}
