import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { provideMockStore } from '@ngrx/store/testing';
import { Action } from '@ngrx/store';
import { EMPTY, Subject } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppVisibilityService } from 'src/app/services/app-visibility.service';
import { WebSocketService } from 'src/app/services/websocket.service';
import { resyncPending, resyncRequested } from './realtime.actions';
import { RealtimeEffects } from './realtime.effects';
import { selectCurrentTrainingAdminInformations } from 'src/app/store/training/training.selectors';
import { spectateTrainingSession } from 'src/app/store/training/training.session.actions';
import { loadTrainingParticipantCurrentMatchSuccess } from 'src/app/store/training/training.actions';

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

  it('marks the resync pending right away, before the debounced resync', () => {
    const effects = TestBed.inject(RealtimeEffects);
    const emitted: Action[] = [];
    effects.markResyncPending$.subscribe((action) => emitted.push(action));

    resumed$.next();

    expect(emitted).toEqual([resyncPending()]);
  });

  it('marks the resync pending on every signal, websocket reconnection included', () => {
    const effects = TestBed.inject(RealtimeEffects);
    const emitted: Action[] = [];
    effects.markResyncPending$.subscribe((action) => emitted.push(action));

    reconnected$.next();
    resumed$.next();

    expect(emitted).toEqual([resyncPending(), resyncPending()]);
  });

  // Each pending mark must be followed by a resync: otherwise nothing would reload the match and
  // the score entry would stay locked.
  it('always follows a burst of signals with exactly one resync', () => {
    const effects = TestBed.inject(RealtimeEffects);
    const emitted: Action[] = [];
    effects.resyncOnReconnect$.subscribe((action) => emitted.push(action));

    resumed$.next();
    vi.advanceTimersByTime(500);
    reconnected$.next();
    vi.advanceTimersByTime(500);
    resumed$.next();
    vi.advanceTimersByTime(1_000);

    expect(emitted).toEqual([resyncRequested()]);
  });
});

describe('RealtimeEffects - connectWebSocketTraining$', () => {
  // The admin trigger reads the admin session as soon as the effect is subscribed: without a
  // value, the selector runs on an empty mock state and throws.
  const noAdmin = provideMockStore({
    selectors: [{ selector: selectCurrentTrainingAdminInformations, value: null }],
  });

  it('joins the public room of the followed session', () => {
    const actions$ = new Subject<Action>();
    const connectTrainingSession = vi.fn();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        RealtimeEffects,
        provideMockActions(() => actions$),
        noAdmin,
        {
          provide: WebSocketService,
          useValue: { reconnected$: EMPTY, on: () => EMPTY, connectTrainingSession },
        },
        { provide: AppVisibilityService, useValue: { resumed$: EMPTY } },
      ],
    });
    const effects = TestBed.inject(RealtimeEffects);
    effects.connectWebSocketTraining$.subscribe();

    actions$.next(spectateTrainingSession({ sessionCode: '123456' }));

    // No password: the public room, the same one as the players.
    expect(connectTrainingSession).toHaveBeenCalledWith('123456');
  });

  it('dispatches an event once after going from spectator to player of the same session', () => {
    const actions$ = new Subject<Action>();
    const matchUpdated$ = new Subject<unknown>();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        RealtimeEffects,
        provideMockActions(() => actions$),
        noAdmin,
        {
          provide: WebSocketService,
          useValue: {
            reconnected$: EMPTY,
            on: (event: string) => (event === 'match:updated' ? matchUpdated$ : EMPTY),
            connectTrainingSession: vi.fn(),
          },
        },
        { provide: AppVisibilityService, useValue: { resumed$: EMPTY } },
      ],
    });
    const emitted: Action[] = [];
    TestBed.inject(RealtimeEffects).connectWebSocketTraining$.subscribe((action) =>
      emitted.push(action),
    );

    actions$.next(spectateTrainingSession({ sessionCode: '123456' }));
    actions$.next(
      loadTrainingParticipantCurrentMatchSuccess({
        sessionCode: '123456',
      } as ReturnType<typeof loadTrainingParticipantCurrentMatchSuccess>),
    );
    matchUpdated$.next({ id: 'm1' });

    expect(emitted).toHaveLength(1);
  });
});
