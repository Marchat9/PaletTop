import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { provideMockStore } from '@ngrx/store/testing';
import { Action } from '@ngrx/store';
import { EMPTY, Subject } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppVisibilityService } from 'src/app/services/app-visibility.service';
import { WebSocketService } from 'src/app/services/websocket.service';
import { resyncRequested } from './realtime.actions';
import { RealtimeEffects } from './realtime.effects';

describe('RealtimeEffects - resyncOnReconnect$', () => {
  let reconnected$: Subject<void>;
  let resumed$: Subject<void>;

  beforeEach(() => {
    vi.useFakeTimers();
    reconnected$ = new Subject<void>();
    resumed$ = new Subject<void>();

    TestBed.configureTestingModule({
      providers: [
        RealtimeEffects,
        provideMockActions(() => EMPTY),
        provideMockStore(),
        {
          provide: WebSocketService,
          useValue: { reconnected$, on: () => EMPTY, connect: vi.fn(), disconnect: vi.fn() },
        },
        { provide: AppVisibilityService, useValue: { resumed$ } },
      ],
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('dispatches resyncRequested when the websocket reconnects', () => {
    const effects = TestBed.inject(RealtimeEffects);
    const emitted: Action[] = [];
    effects.resyncOnReconnect$.subscribe((action) => emitted.push(action));

    reconnected$.next();
    vi.advanceTimersByTime(1_000);

    expect(emitted).toEqual([resyncRequested()]);
  });

  it('dispatches resyncRequested when the app resumes to the foreground', () => {
    const effects = TestBed.inject(RealtimeEffects);
    const emitted: Action[] = [];
    effects.resyncOnReconnect$.subscribe((action) => emitted.push(action));

    resumed$.next();
    vi.advanceTimersByTime(1_000);

    expect(emitted).toEqual([resyncRequested()]);
  });

  it('coalesces near-simultaneous reconnect and resume signals into a single dispatch', () => {
    const effects = TestBed.inject(RealtimeEffects);
    const emitted: Action[] = [];
    effects.resyncOnReconnect$.subscribe((action) => emitted.push(action));

    reconnected$.next();
    resumed$.next();
    vi.advanceTimersByTime(1_000);

    expect(emitted).toEqual([resyncRequested()]);
  });
});
