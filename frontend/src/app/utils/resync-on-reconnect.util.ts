import { DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Actions, ofType } from '@ngrx/effects';
import { resyncRequested } from 'src/app/store/realtime/realtime.actions';

/**
 * Runs `callback` whenever a resync is requested (websocket reconnect, or the app/tab
 * coming back to the foreground). Must be called from an injection context (e.g. a
 * component constructor); the subscription is torn down automatically on destroy.
 */
export function onResyncRequested(callback: () => void): void {
  const actions$ = inject(Actions);
  const destroyRef = inject(DestroyRef);

  actions$.pipe(ofType(resyncRequested), takeUntilDestroyed(destroyRef)).subscribe(callback);
}
