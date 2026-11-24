import { createReducer, on } from '@ngrx/store';
import { TournamentPlan } from 'src/app/models/tournament-plan.model';
import { previewPlan, previewPlanFailure, previewPlanSuccess } from './tournament-plan.actions';

export interface TournamentPlanState {
  plan: TournamentPlan | null;
  isLoading: boolean;
  error: string | null;
  /** Id of the latest preview request: older results are ignored. */
  latestRequestId: string | null;
}

export const initialTournamentPlanState: TournamentPlanState = {
  plan: null,
  isLoading: false,
  error: null,
  latestRequestId: null,
};

export const tournamentPlanReducer = createReducer(
  initialTournamentPlanState,
  on(previewPlan, (state, { requestId }) => ({
    ...state,
    isLoading: true,
    error: null,
    latestRequestId: requestId,
  })),
  on(previewPlanSuccess, (state, { requestId, plan }) =>
    requestId === state.latestRequestId ? { ...state, plan, isLoading: false, error: null } : state,
  ),
  on(previewPlanFailure, (state, { requestId, error }) =>
    requestId === state.latestRequestId ? { ...state, isLoading: false, error } : state,
  ),
);
