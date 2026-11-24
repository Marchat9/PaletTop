import { createReducer, on } from '@ngrx/store';
import { TournamentPlan } from 'src/app/models/tournament-plan.model';
import {
  previewPlan,
  previewPlanFailure,
  previewPlanSuccess,
  simulatePlan,
  simulatePlanFailure,
  simulatePlanSuccess,
} from './tournament-plan.actions';

export interface TournamentPlanState {
  plan: TournamentPlan | null;
  isLoading: boolean;
  error: string | null;
  /** Id of the latest preview request: older results are ignored. */
  latestRequestId: string | null;
  /** Plan of the simulation, kept apart from the preview of the form. */
  simulatedPlan: TournamentPlan | null;
  simulationError: string | null;
  /** Id of the latest simulation request: older results are ignored. */
  latestSimulationRequestId: string | null;
}

export const initialTournamentPlanState: TournamentPlanState = {
  plan: null,
  isLoading: false,
  error: null,
  latestRequestId: null,
  simulatedPlan: null,
  simulationError: null,
  latestSimulationRequestId: null,
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
  on(simulatePlan, (state, { requestId }) => ({
    ...state,
    simulationError: null,
    latestSimulationRequestId: requestId,
  })),
  on(simulatePlanSuccess, (state, { requestId, plan }) =>
    requestId === state.latestSimulationRequestId
      ? { ...state, simulatedPlan: plan, simulationError: null }
      : state,
  ),
  on(simulatePlanFailure, (state, { requestId, error }) =>
    requestId === state.latestSimulationRequestId ? { ...state, simulationError: error } : state,
  ),
);
