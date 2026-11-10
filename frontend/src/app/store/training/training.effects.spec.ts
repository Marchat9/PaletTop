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
});
