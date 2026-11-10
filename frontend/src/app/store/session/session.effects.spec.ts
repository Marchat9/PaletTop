import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { Action } from '@ngrx/store';
import { provideMockStore } from '@ngrx/store/testing';
import { ReplaySubject } from 'rxjs';
import { describe, expect, it } from 'vitest';
import { SessionService } from 'src/app/services/session.service';
import {
  nextSessionSuccess,
  startTournamentSuccess,
} from 'src/app/store/tournament/tournament.match.actions';
import { TournamentDto } from 'src/app/store/tournament/tournament.models';
import { loadSessions } from './session.actions';
import { SessionEffects } from './session.effects';

function setup() {
  const actions$ = new ReplaySubject<Action>(1);
  TestBed.configureTestingModule({
    providers: [
      SessionEffects,
      provideMockActions(() => actions$),
      provideMockStore(),
      { provide: SessionService, useValue: {} },
    ],
  });
  const emitted: Action[] = [];
  TestBed.inject(SessionEffects).loadSessionsAfterRoundCreated$.subscribe((action) =>
    emitted.push(action),
  );
  return { actions$, emitted };
}

const tournament = { code: 'LAITON-2026' } as TournamentDto;

describe('SessionEffects', () => {
  // Without a websocket, the admin page would otherwise never show the round it just created.
  it('reloads the rounds over HTTP once the tournament has started', () => {
    const { actions$, emitted } = setup();

    actions$.next(startTournamentSuccess({ tournament }));

    expect(emitted).toEqual([loadSessions({ code: 'LAITON-2026' })]);
  });

  it('reloads the rounds over HTTP once the next round is created', () => {
    const { actions$, emitted } = setup();

    actions$.next(nextSessionSuccess({ tournament }));

    expect(emitted).toEqual([loadSessions({ code: 'LAITON-2026' })]);
  });
});
