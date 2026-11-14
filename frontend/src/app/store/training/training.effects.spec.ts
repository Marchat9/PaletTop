import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { Action } from '@ngrx/store';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { of, ReplaySubject, throwError } from 'rxjs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TrainingService } from 'src/app/services/training.service';
import { addNotification } from 'src/app/store/app-config/app-config.actions';
import { TrainingEffects } from './training.effects';
import { TrainingCurrentMatchDto, TrainingMatchDto, TrainingRoundDto } from './training.models';
import {
  updateTrainingScore,
  updateTrainingScoreConflict,
  updateTrainingScoreSuccess,
  validateTrainingMatch,
  validateTrainingMatchConflict,
  validateTrainingMatchSuccess,
} from './training.match.actions';
import { loadTrainingParticipantCurrentMatch } from './training.actions';
import { wsTrainingLeaderboardUpdated } from '../realtime/realtime.actions';
import {
  closeTrainingSessionFailure,
  refreshTrainingClubLeaderboard,
} from './training.session.actions';
import {
  selectFollowedTrainingClubLeaderboardSession,
  selectTrainingParticipantCurrentMatch,
  selectTrainingRounds,
} from './training.selectors';

describe('TrainingEffects', () => {
  describe('player validation', () => {
    function setupValidation(validateMatch: () => unknown) {
      const actions$ = new ReplaySubject<Action>(1);
      const trainingService = { validateMatch: vi.fn(validateMatch) };
      const current = {
        participant: { id: 'p1', name: 'Jean' },
        match: { id: 'm1', scoreA: 13, scoreB: 9 },
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
      TestBed.inject(TrainingEffects).validateTrainingMatch$.subscribe((action) =>
        emitted.push(action),
      );
      actions$.next(
        validateTrainingMatch({
          sessionCode: '123456',
          matchId: 'm1',
          participantCode: '1111',
          opponentParticipantCode: '2222',
        }),
      );
      return { trainingService, emitted };
    }

    it('sends the validation with the score shown to the player', () => {
      const match = { id: 'm1' } as TrainingMatchDto;
      const { trainingService, emitted } = setupValidation(() => of(match));

      expect(trainingService.validateMatch).toHaveBeenCalledWith('123456', 'm1', '1111', '2222', {
        scoreA: 13,
        scoreB: 9,
      });
      expect(emitted).toEqual([validateTrainingMatchSuccess({ match })]);
    });

    it('reloads the match instead of validating a score that changed meanwhile', () => {
      const { emitted } = setupValidation(() =>
        throwError(() => new HttpErrorResponse({ status: 409 })),
      );

      expect(emitted.map((action) => action.type)).toEqual([
        validateTrainingMatchConflict.type,
        loadTrainingParticipantCurrentMatch.type,
        '[App Config] Add Notification',
      ]);
    });
  });

  describe('closing failure', () => {
    function closeFailure(matchStatus: string) {
      const actions$ = new ReplaySubject<Action>(1);
      const rounds = [
        {
          id: 'r1',
          roundNumber: 1,
          status: 'OPEN',
          matches: [{ isBye: false, status: matchStatus }],
        },
      ] as unknown as TrainingRoundDto[];
      TestBed.configureTestingModule({
        providers: [
          TrainingEffects,
          provideMockActions(() => actions$),
          provideMockStore({ selectors: [{ selector: selectTrainingRounds, value: rounds }] }),
          { provide: TrainingService, useValue: {} },
        ],
      });
      const emitted: Action[] = [];
      TestBed.inject(TrainingEffects).closeSessionErrors$.subscribe((action) =>
        emitted.push(action),
      );
      actions$.next(closeTrainingSessionFailure({ error: 'Erreur réseau' }));
      return emitted;
    }

    it('shows a message when every match is validated (network, server, password)', () => {
      expect(closeFailure('VALIDATED').map((action) => action.type)).toEqual([
        addNotification.type,
      ]);
    });

    it('leaves the refusal for an unvalidated match to the page', () => {
      expect(closeFailure('ONGOING')).toEqual([]);
    });
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

    function setup(updateScore: () => unknown, beforeSend: (store: MockStore) => void = () => {}) {
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
      beforeSend(TestBed.inject(MockStore));
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

    // The opponent's point arrives during the grouping delay: the entry still started from 4-2,
    // so the server must see that base and refuse, instead of erasing that point.
    it('keeps the score of the click as base, even when the opponent scores before sending', () => {
      const { trainingService } = setup(
        () => of({ id: 'm1' } as TrainingMatchDto),
        (store) => {
          store.overrideSelector(selectTrainingParticipantCurrentMatch, {
            participant: { id: 'p1', name: 'Jean' },
            match: { id: 'm1', scoreA: 5, scoreB: 2 },
          } as unknown as TrainingCurrentMatchDto);
          store.refreshState();
        },
      );

      expect(trainingService.updateScore).toHaveBeenCalledWith('123456', 'm1', '1111', 4, 3, {
        scoreA: 4,
        scoreB: 2,
      });
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
