import { HttpErrorResponse } from '@angular/common/http';
import { MonoTypeOperatorFunction, of, retry, throwError, timeout, TimeoutError } from 'rxjs';
import { environment } from '@environment';

/** Worth a second try: no answer in time, no network, or a failing server. */
function isTransientError(error: unknown): boolean {
  return (
    error instanceof TimeoutError ||
    (error instanceof HttpErrorResponse && (error.status === 0 || error.status >= 500))
  );
}

/**
 * For the reloads that unlock the score entry: a request still unanswered after `reloadTimeout`
 * is given up, and a transient failure is tried once more before the error goes through. A
 * refusal (4xx) is not retried: it would only be refused again.
 */
export function withTimeoutAndOneRetry<T>(): MonoTypeOperatorFunction<T> {
  return (source) =>
    source.pipe(
      timeout(environment.apiConfiguration.reloadTimeout),
      retry({
        count: 1,
        delay: (error) => (isTransientError(error) ? of(null) : throwError(() => error)),
      }),
    );
}
