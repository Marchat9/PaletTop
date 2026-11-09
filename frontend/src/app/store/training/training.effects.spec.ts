import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { Action } from '@ngrx/store';
import { provideMockStore } from '@ngrx/store/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { of, ReplaySubject, throwError } from 'rxjs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TrainingService } from 'src/app/services/training.service';
import { addNotification } from 'src/app/store/app-config/app-config.actions';
import { TrainingEffects } from './training.effects';
import { TrainingCurrentMatchDto, TrainingMatchDto } from './training.models';
import {
  updateTrainingScore,
  updateTrainingScoreConflict,
  updateTrainingScoreSuccess,
  validateTrainingMatch,
  validateTrainingMatchSuccess,
} from './training.match.actions';
import { loadTrainingParticipantCurrentMatch } from './training.actions';
import { wsTrainingLeaderboardUpdated } from '../realtime/realtime.actions';
import { refreshTrainingClubLeaderboard } from './training.session.actions';
import {
  selectFollowedTrainingClubLeaderboardSession,
  selectTrainingParticipantCurrentMatch,
} from './training.selectors';

describe('TrainingEffects', () => {
  it('sends the player validation of a match to the server', async () => {
    const actions$ = new ReplaySubject<Action>(1);
    const match = { id: 'm1' } as TrainingMatchDto;
    const trainingService = { validateMatch: vi.fn(() => of(match)) };
    TestBed.configureTestingModule({
      providers: [
        TrainingEffects,
        provideMockActions(() => actions$),
        provideMockStore(),
        { provide: TrainingService, useValue: trainingService },
      ],
    });
    const effects = TestBed.inject(TrainingEffects);
    const emitted: Action[] = [];
    effects.validateTrainingMatch$.subscribe((action) => emitted.push(action));

    actions$.next(
      validateTrainingMatch({
        sessionCode: '123456',
        matchId: 'm1',
        participantCode: '1111',
        opponentParticipantCode: '2222',
      }),
    );
    await Promise.resolve();

    expect(trainingService.validateMatch).toHaveBeenCalledWith('123456', 'm1', '1111', '2222');
    expect(emitted).toEqual([validateTrainingMatchSuccess({ match })]);
  });

  describe('club leaderboard open in a popup', () => {
    afterEach(() => vi.useRealTimers());

    function setup(followedSession: string | null, validatedMatches = 1) {
      vi.useFakeTimers();
      const actions$ = new ReplaySubject<Action>(1);
      TestBed.configureTestingModule({
        providers: [
          TrainingEffects,
          provideMockActions(() => actions$),
          provideMockStore({
            selectors: [
              { selector: selectFollowedTrainingClubLeaderboardSession, value: followedSession },
            ],
          }),
          { provide: TrainingService, useValue: {} },
        ],
      });
      const emitted: Action[] = [];
      TestBed.inject(TrainingEffects).refreshFollowedClubLeaderboard$.subscribe((action) =>
        emitted.push(action),
      );
      for (let i = 0; i < validatedMatches; i++) {
        actions$.next(wsTrainingLeaderboardUpdated({ leaderboard: [] }));
      }
      vi.runAllTimers();
      return emitted;
    }

    it('is refreshed after a validated match while the popup is open', () => {
      expect(setup('123456')).toEqual([refreshTrainingClubLeaderboard({ sessionCode: '123456' })]);
    });

    it('is refreshed once for a burst of validated matches', () => {
      expect(setup('123456', 5)).toEqual([
        refreshTrainingClubLeaderboard({ sessionCode: '123456' }),
      ]);
    });

    it('is left alone once the popup is closed', () => {
      expect(setup(null)).toEqual([]);
    });
  });

  describe('score entry against a stale score', () => {
    afterEach(() => vi.useRealTimers());

    function setup(updateScore: () => unknown) {
      vi.useFakeTimers();
      const actions$ = new ReplaySubject<Action>(1);
      const trainingService = { updateScore: vi.fn(updateScore) };
      const current = {
        participant: { id: 'p1', name: 'Jean' },
        match: { id: 'm1', scoreA: 4, scoreB: 2 },
      } as unknown as TrainingCurrentMatchDto;
      TestBed.configureTestingModule({
        providers: [
          TrainingEffects,
          provideMockActions(() => actions$),
          provideMockStore({
            selectors: [{ selector: selectTrainingParticipantCurrentMatch, value: current }],
          }),
          { provide: TrainingService, useValue: trainingService },
        ],
      });
      const emitted: Action[] = [];
      TestBed.inject(TrainingEffects).updateTrainingScore$.subscribe((action) =>
        emitted.push(action),
      );
      actions$.next(
        updateTrainingScore({
          sessionCode: '123456',
          matchId: 'm1',
          participantCode: '1111',
          scoreA: 4,
          scoreB: 3,
        }),
      );
      vi.runAllTimers();
      return { trainingService, emitted };
    }

    it('sends the score the entry is based on with the new one', () => {
      const saved = { id: 'm1', scoreA: 4, scoreB: 3 } as TrainingMatchDto;
      const { trainingService, emitted } = setup(() => of(saved));

      expect(trainingService.updateScore).toHaveBeenCalledWith('123456', 'm1', '1111', 4, 3, {
        scoreA: 4,
        scoreB: 2,
      });
      expect(emitted).toEqual([updateTrainingScoreSuccess({ match: saved })]);
    });

    it('reloads the match and warns the player when the score changed meanwhile', () => {
      const { emitted } = setup(() => throwError(() => new HttpErrorResponse({ status: 409 })));

      expect(emitted.map((action) => action.type)).toEqual([
        updateTrainingScoreConflict.type,
        loadTrainingParticipantCurrentMatch.type,
        addNotification.type,
      ]);
      expect(emitted[1]).toEqual(
        loadTrainingParticipantCurrentMatch({ sessionCode: '123456', participantCode: '1111' }),
      );
    });
  });
});
