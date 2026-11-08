import { HttpErrorResponse } from '@angular/common/http';
import { defer, NEVER, Observable, of, throwError, TimeoutError } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { environment } from '@environment';
import { withTimeoutAndOneRetry } from './reload-retry.util';

/** A request answering each subscription with the next behaviour of the list. */
function requestAnswering(...answers: Observable<string>[]): {
  request$: Observable<string>;
  attempts: () => number;
} {
  let attempts = 0;
  const request$ = defer(() => answers[Math.min(attempts++, answers.length - 1)]);
  return { request$, attempts: () => attempts };
}

function run(request$: Observable<string>) {
  const result = { value: null as string | null, error: null as unknown };
  request$.pipe(withTimeoutAndOneRetry()).subscribe({
    next: (value) => (result.value = value),
    error: (error) => (result.error = error),
  });
  return result;
}

describe('withTimeoutAndOneRetry', () => {
  const timeoutMs = environment.apiConfiguration.reloadTimeout;

  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('lets a quick answer through without retrying', () => {
    const { request$, attempts } = requestAnswering(of('ok'));
    expect(run(request$).value).toBe('ok');
    expect(attempts()).toBe(1);
  });

  it('gives up on a hanging request after the timeout, then succeeds on the retry', () => {
    const { request$, attempts } = requestAnswering(NEVER, of('ok'));
    const result = run(request$);

    vi.advanceTimersByTime(timeoutMs - 1);
    expect(result.value).toBeNull();

    vi.advanceTimersByTime(1);
    expect(result.value).toBe('ok');
    expect(attempts()).toBe(2);
  });

  it('fails after a second hanging attempt, two timeouts later', () => {
    const { request$, attempts } = requestAnswering(NEVER);
    const result = run(request$);

    vi.advanceTimersByTime(timeoutMs);
    expect(result.error).toBeNull();

    vi.advanceTimersByTime(timeoutMs);
    expect(result.error).toBeInstanceOf(TimeoutError);
    expect(attempts()).toBe(2);
  });

  it('retries a network error only once', () => {
    const offline = throwError(() => new HttpErrorResponse({ status: 0 }));
    const { request$, attempts } = requestAnswering(offline);
    const result = run(request$);
    vi.runAllTimers();

    expect(result.error).toBeInstanceOf(HttpErrorResponse);
    expect(attempts()).toBe(2);
  });

  it('does not retry a refusal from the API', () => {
    const refused = throwError(() => new HttpErrorResponse({ status: 404 }));
    const { request$, attempts } = requestAnswering(refused);
    const result = run(request$);
    vi.runAllTimers();

    expect((result.error as HttpErrorResponse).status).toBe(404);
    expect(attempts()).toBe(1);
  });
});
