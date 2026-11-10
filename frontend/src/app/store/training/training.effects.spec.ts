import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { Action } from '@ngrx/store';
import { provideMockStore } from '@ngrx/store/testing';
import { of, ReplaySubject } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { TrainingService } from 'src/app/services/training.service';
import { TrainingEffects } from './training.effects';
import { TrainingMatchDto } from './training.models';
import { validateTrainingMatch, validateTrainingMatchSuccess } from './training.match.actions';
import { wsTrainingLeaderboardUpdated } from '../realtime/realtime.actions';
import { refreshTrainingClubLeaderboard } from './training.session.actions';
import { selectFollowedTrainingClubLeaderboardSession } from './training.selectors';

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
});
