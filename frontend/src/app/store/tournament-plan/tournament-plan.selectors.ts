import { createFeatureSelector, createSelector } from '@ngrx/store';
import { TournamentPlanState } from './tournament-plan.reducer';

export const tournamentPlanFeatureKey = 'tournamentPlan';

export const selectTournamentPlanState =
  createFeatureSelector<TournamentPlanState>(tournamentPlanFeatureKey);

export const selectPlanPreview = createSelector(selectTournamentPlanState, (state) => state.plan);

export const selectPlanPreviewLoading = createSelector(
  selectTournamentPlanState,
  (state) => state.isLoading,
);

export const selectPlanPreviewError = createSelector(
  selectTournamentPlanState,
  (state) => state.error,
);

export const selectSimulatedPlan = createSelector(
  selectTournamentPlanState,
  (state) => state.simulatedPlan,
);

export const selectSimulationError = createSelector(
  selectTournamentPlanState,
  (state) => state.simulationError,
);
