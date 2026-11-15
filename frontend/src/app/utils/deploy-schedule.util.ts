import { defer, map, Observable, repeat, timer } from 'rxjs';

/**
 * Releases are deployed on the hour and at half past: the app checks for a new version a few
 * minutes later, once it is up, instead of polling all the time.
 */
export const DEPLOY_CHECK_MINUTES = [5, 35];

/** Milliseconds from `now` to the next check slot (hh:05 or hh:35), never 0. */
export function delayUntilNextDeployCheck(now: Date): number {
  const next = new Date(now);
  next.setSeconds(0, 0);
  const minute = DEPLOY_CHECK_MINUTES.find((slot) => slot > now.getMinutes());
  if (minute !== undefined) {
    next.setMinutes(minute);
  } else {
    next.setHours(now.getHours() + 1, DEPLOY_CHECK_MINUTES[0]);
  }
  return next.getTime() - now.getTime();
}

/** Emits at every check slot, recomputed each time so the clock never drifts. */
export function deployCheckSlots$(): Observable<void> {
  return defer(() => timer(delayUntilNextDeployCheck(new Date()))).pipe(
    repeat(),
    map(() => undefined),
  );
}
