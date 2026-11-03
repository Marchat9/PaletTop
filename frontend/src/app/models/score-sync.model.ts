import { Nullable } from './nullable.model';

/**
 * Where a score typed by a player stands when the network is unreliable:
 * - `idle`: nothing to say (sent normally, or nothing typed);
 * - `pending`: could not be sent for lack of network, kept on the device and resent automatically;
 * - `synced`: the pending score has just been resent; shown briefly, then back to `idle`.
 */
export type ScoreSyncStatus = 'idle' | 'pending' | 'synced';

export interface ScoreSync<T> {
  status: ScoreSyncStatus;
  /** The last score that could not be sent, resent as is. */
  pending: Nullable<T>;
}

export const INITIAL_SCORE_SYNC = { status: 'idle', pending: null } as const;

/** How long the "Synchronisé" badge stays before fading out. */
export const SYNCED_BADGE_DURATION_MS = 2500;

/** While a score is pending, it is resent at this pace (and as soon as the network comes back). */
export const PENDING_SCORE_RETRY_MS = 10_000;

/** Shown when the server refuses a score resent after an outage (match validated meanwhile...). */
export const OFFLINE_SCORE_REJECTED_MESSAGE =
  "Le match a été validé entre-temps : votre score saisi hors ligne n'a pas été pris en compte.";
