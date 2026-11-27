/** Where a "don't ask again" choice applies: a tournament or a training session. */
export type RoundConfirmationScope = 'tournament' | 'training';

/** An opt-out lasts 24 hours at most: a code freed and given again later is asked again. */
export const ROUND_CONFIRMATION_SKIP_TTL_MS = 24 * 60 * 60 * 1000;

const SKIP_KEY_PREFIX = 'skipRoundConfirmation.';

/**
 * Key of one opt-out in the localStorage cache of the app config, its value being the time of the
 * opt-out. One key per tournament or session: each tab only writes its own key, so two open tabs
 * never overwrite each other's choices.
 */
export function skipRoundConfirmationKey(scope: RoundConfirmationScope, code: string): string {
  return `${SKIP_KEY_PREFIX}${scope}.${code}`;
}

function isFresh(savedAt: unknown, now: number): boolean {
  return typeof savedAt === 'number' && now - savedAt < ROUND_CONFIRMATION_SKIP_TTL_MS;
}

/** Whether the admin chose, less than 24 hours ago, not to confirm the rounds of this code. */
export function isRoundConfirmationSkipped(
  data: Record<string, unknown>,
  scope: RoundConfirmationScope,
  code: string,
  now: number,
): boolean {
  return isFresh(data[skipRoundConfirmationKey(scope, code)], now);
}

/** The stored data without the expired (or malformed) opt-outs. */
export function withoutExpiredRoundSkips(
  data: Record<string, unknown>,
  now: number,
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(data).filter(
      ([key, value]) => !key.startsWith(SKIP_KEY_PREFIX) || isFresh(value, now),
    ),
  );
}
