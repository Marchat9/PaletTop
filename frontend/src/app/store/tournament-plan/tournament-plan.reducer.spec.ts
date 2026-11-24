import { describe, expect, it } from 'vitest';
import { PlanPreviewBody, TournamentPlan } from 'src/app/models/tournament-plan.model';
import { previewPlan, previewPlanFailure, previewPlanSuccess } from './tournament-plan.actions';
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
});
