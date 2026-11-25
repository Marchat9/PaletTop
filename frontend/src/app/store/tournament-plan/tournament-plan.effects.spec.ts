import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { Action } from '@ngrx/store';
import { Observable, of, ReplaySubject, throwError } from 'rxjs';
import { describe, expect, it } from 'vitest';
import { PlanPreviewBody, TournamentPlan } from 'src/app/models/tournament-plan.model';
import { TournamentPlanService } from 'src/app/services/tournament-plan.service';
import { convertErrorToString } from 'src/app/utils/api-call.utils';
import {
  previewLaunchPlan,
  previewLaunchPlanFailure,
  previewLaunchPlanSuccess,
  previewPlan,
  previewPlanFailure,
  previewPlanSuccess,
  simulatePlan,
  simulatePlanFailure,
  simulatePlanSuccess,
} from './tournament-plan.actions';
import { addNotification } from '../app-config/app-config.actions';
import { TournamentPlanEffects } from './tournament-plan.effects';

function run(
  preview: TournamentPlanService['preview'],
  effect: 'previewPlan$' | 'simulatePlan$' = 'previewPlan$',
) {
  const actions$ = new ReplaySubject<Action>(1);
  TestBed.configureTestingModule({
    providers: [
      TournamentPlanEffects,
      provideMockActions(() => actions$),
      { provide: TournamentPlanService, useValue: { preview } },
    ],
  });
  const emitted: Action[] = [];
  (TestBed.inject(TournamentPlanEffects)[effect] as Observable<Action>).subscribe((action) =>
    emitted.push(action),
  );
  const request = effect === 'previewPlan$' ? previewPlan : simulatePlan;
  actions$.next(request({ requestId: 'r1', body: {} as PlanPreviewBody }));
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

  it('maps the simulation results to the simulation actions', () => {
    const plan = { teamCount: 12 } as TournamentPlan;
    const error = new HttpErrorResponse({ status: 400, error: { message: 'bad' } });
    expect(run(() => of(plan), 'simulatePlan$')).toEqual([
      simulatePlanSuccess({ requestId: 'r1', plan }),
    ]);
    TestBed.resetTestingModule();
    expect(run(() => throwError(() => error), 'simulatePlan$')).toEqual([
      simulatePlanFailure({ requestId: 'r1', error: convertErrorToString(error) }),
    ]);
  });

  describe('launch check', () => {
    function runLaunch(preview: TournamentPlanService['preview']) {
      const actions$ = new ReplaySubject<Action>(1);
      TestBed.configureTestingModule({
        providers: [
          TournamentPlanEffects,
          provideMockActions(() => actions$),
          { provide: TournamentPlanService, useValue: { preview } },
        ],
      });
      const effects = TestBed.inject(TournamentPlanEffects);
      const results: Action[] = [];
      const notifications: Action[] = [];
      effects.previewLaunchPlan$.subscribe((action) => results.push(action));
      effects.launchPlanErrors$.subscribe((action) => notifications.push(action));
      actions$.next(previewLaunchPlan({ body: {} as PlanPreviewBody }));
      return { actions$, results, notifications };
    }

    it('maps a success to previewLaunchPlanSuccess', () => {
      const plan = { teamCount: 117 } as TournamentPlan;
      expect(runLaunch(() => of(plan)).results).toEqual([previewLaunchPlanSuccess({ plan })]);
    });

    it('tells the admin when the plan cannot be computed', () => {
      const error = new HttpErrorResponse({ status: 400, error: { message: 'bad' } });
      const { actions$, results, notifications } = runLaunch(() => throwError(() => error));
      expect(results).toEqual([previewLaunchPlanFailure({ error: 'bad' })]);

      actions$.next(previewLaunchPlanFailure({ error: 'bad' }));

      expect(notifications).toHaveLength(1);
      expect(notifications[0]).toMatchObject({
        type: addNotification.type,
        notification: { message: 'bad', typeIcon: 'error' },
      });
    });
  });
});
