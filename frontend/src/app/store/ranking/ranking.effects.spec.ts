import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { Action } from '@ngrx/store';
import { provideMockStore } from '@ngrx/store/testing';
import { ReplaySubject } from 'rxjs';
import { describe, expect, it } from 'vitest';
import { RankingService } from 'src/app/services/ranking.service';
import { adminUpdateScoreSuccess } from 'src/app/store/match/match.actions';
import { SessionService } from 'src/app/services/session.service';
import { SessionEffects } from 'src/app/store/session/session.effects';
import { loadSessions } from 'src/app/store/session/session.actions';
import {
  nextSessionSuccess,
  startTournamentSuccess,
} from 'src/app/store/tournament/tournament.match.actions';
import { TournamentDto } from 'src/app/store/tournament/tournament.models';
import { selectCurrentTournamentAdminInformations } from 'src/app/store/tournament/tournament.selectors';
import { loadRanking } from './ranking.actions';
import { RankingEffects } from './ranking.effects';

function setup() {
  const actions$ = new ReplaySubject<Action>(1);
  TestBed.configureTestingModule({
    providers: [
      RankingEffects,
      SessionEffects,
      provideMockActions(() => actions$),
      provideMockStore({
        selectors: [
          {
            selector: selectCurrentTournamentAdminInformations,
            value: { code: 'LAITON-2026', password: 'secret' },
          },
        ],
      }),
      { provide: RankingService, useValue: {} },
      { provide: SessionService, useValue: {} },
    ],
  });
  const ranking = TestBed.inject(RankingEffects);
  const sessions = TestBed.inject(SessionEffects);
  const emitted: Action[] = [];
  ranking.loadRankingAfterRoundCreated$.subscribe((action) => emitted.push(action));
  ranking.loadRankingAfterAdminCorrection$.subscribe((action) => emitted.push(action));
  sessions.loadSessionsAfterAdminCorrection$.subscribe((action) => emitted.push(action));
  return { actions$, emitted };
}

const tournament = { code: 'LAITON-2026' } as TournamentDto;

// Without a websocket, the admin page would otherwise keep an outdated ranking.
describe('RankingEffects reloads over HTTP', () => {
  it('once the tournament has started (byes are already won)', () => {
    const { actions$, emitted } = setup();
    actions$.next(startTournamentSuccess({ tournament }));
    expect(emitted).toEqual([loadRanking({ code: 'LAITON-2026' })]);
  });

  it('once the next round is created', () => {
    const { actions$, emitted } = setup();
    actions$.next(nextSessionSuccess({ tournament }));
    expect(emitted).toEqual([loadRanking({ code: 'LAITON-2026' })]);
  });

  it('with the rounds, after an admin score correction', () => {
    const { actions$, emitted } = setup();
    actions$.next(adminUpdateScoreSuccess());
    expect(emitted).toEqual([
      loadRanking({ code: 'LAITON-2026' }),
      loadSessions({ code: 'LAITON-2026' }),
    ]);
  });
});
