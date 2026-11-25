import { describe, expect, it } from 'vitest';
import { PlanPreviewBody, TournamentPlan } from 'src/app/models/tournament-plan.model';
import {
  previewPlan,
  previewPlanFailure,
  previewPlanSuccess,
  simulatePlan,
  simulatePlanFailure,
  simulatePlanSuccess,
} from './tournament-plan.actions';
import { initialTournamentPlanState, tournamentPlanReducer } from './tournament-plan.reducer';

const BODY = {} as PlanPreviewBody;
const plan = (teamCount: number) => ({ teamCount }) as TournamentPlan;

describe('tournamentPlanReducer', () => {
  it('marks the preview as loading and remembers the request id', () => {
    const state = tournamentPlanReducer(
      initialTournamentPlanState,
      previewPlan({ requestId: 'a', body: BODY }),
    );
    expect(state.isLoading).toBe(true);
    expect(state.latestRequestId).toBe('a');
  });

  it('stores the plan of the latest request', () => {
    let state = tournamentPlanReducer(
      initialTournamentPlanState,
      previewPlan({ requestId: 'a', body: BODY }),
    );
    state = tournamentPlanReducer(state, previewPlanSuccess({ requestId: 'a', plan: plan(8) }));
    expect(state.plan?.teamCount).toBe(8);
    expect(state.isLoading).toBe(false);
  });

  it('ignores an older Success', () => {
    let state = tournamentPlanReducer(
      initialTournamentPlanState,
      previewPlan({ requestId: 'a', body: BODY }),
    );
    state = tournamentPlanReducer(state, previewPlan({ requestId: 'b', body: BODY }));
    state = tournamentPlanReducer(state, previewPlanSuccess({ requestId: 'a', plan: plan(8) }));
    expect(state.plan).toBeNull();
    expect(state.isLoading).toBe(true);
  });

  it('ignores an older Failure and keeps the error of the latest one', () => {
    let state = tournamentPlanReducer(
      initialTournamentPlanState,
      previewPlan({ requestId: 'a', body: BODY }),
    );
    state = tournamentPlanReducer(state, previewPlan({ requestId: 'b', body: BODY }));
    state = tournamentPlanReducer(state, previewPlanFailure({ requestId: 'a', error: 'old' }));
    expect(state.error).toBeNull();
    state = tournamentPlanReducer(state, previewPlanFailure({ requestId: 'b', error: 'boom' }));
    expect(state.error).toBe('boom');
    expect(state.isLoading).toBe(false);
  });

  it('keeps the simulated plan apart from the preview', () => {
    let state = tournamentPlanReducer(
      initialTournamentPlanState,
      previewPlan({ requestId: 'p', body: BODY }),
    );
    state = tournamentPlanReducer(state, previewPlanSuccess({ requestId: 'p', plan: plan(8) }));
    state = tournamentPlanReducer(state, simulatePlan({ requestId: 's', body: BODY }));
    state = tournamentPlanReducer(state, simulatePlanSuccess({ requestId: 's', plan: plan(20) }));
    expect(state.plan?.teamCount).toBe(8);
    expect(state.simulatedPlan?.teamCount).toBe(20);
  });

  it('ignores an older simulation result and keeps the error of the latest one', () => {
    let state = tournamentPlanReducer(
      initialTournamentPlanState,
      simulatePlan({ requestId: 'a', body: BODY }),
    );
    state = tournamentPlanReducer(state, simulatePlan({ requestId: 'b', body: BODY }));
    state = tournamentPlanReducer(state, simulatePlanSuccess({ requestId: 'a', plan: plan(8) }));
    expect(state.simulatedPlan).toBeNull();
    state = tournamentPlanReducer(state, simulatePlanFailure({ requestId: 'a', error: 'old' }));
    expect(state.simulationError).toBeNull();
    state = tournamentPlanReducer(state, simulatePlanFailure({ requestId: 'b', error: 'boom' }));
    expect(state.simulationError).toBe('boom');
  });
});
