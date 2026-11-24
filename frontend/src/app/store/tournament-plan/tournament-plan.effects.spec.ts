import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { Action } from '@ngrx/store';
import { of, ReplaySubject, throwError } from 'rxjs';
import { describe, expect, it } from 'vitest';
import { PlanPreviewBody, TournamentPlan } from 'src/app/models/tournament-plan.model';
import { TournamentPlanService } from 'src/app/services/tournament-plan.service';
import { convertErrorToString } from 'src/app/utils/api-call.utils';
import { previewPlan, previewPlanFailure, previewPlanSuccess } from './tournament-plan.actions';
import { TournamentPlanEffects } from './tournament-plan.effects';

function run(preview: TournamentPlanService['preview']) {
  const actions$ = new ReplaySubject<Action>(1);
  TestBed.configureTestingModule({
    providers: [
      TournamentPlanEffects,
      provideMockActions(() => actions$),
      { provide: TournamentPlanService, useValue: { preview } },
    ],
  });
  const emitted: Action[] = [];
  TestBed.inject(TournamentPlanEffects).previewPlan$.subscribe((action) => emitted.push(action));
  actions$.next(previewPlan({ requestId: 'r1', body: {} as PlanPreviewBody }));
  return emitted;
}

describe('TournamentPlanEffects', () => {
  it('maps a success to previewPlanSuccess carrying the request id', () => {
    const plan = { teamCount: 12 } as TournamentPlan;
    expect(run(() => of(plan))).toEqual([previewPlanSuccess({ requestId: 'r1', plan })]);
  });

  it('maps an HTTP error to previewPlanFailure carrying the request id', () => {
    const error = new HttpErrorResponse({ status: 400, error: { message: 'bad' } });
    expect(run(() => throwError(() => error))).toEqual([
      previewPlanFailure({ requestId: 'r1', error: convertErrorToString(error) }),
    ]);
  });
});
