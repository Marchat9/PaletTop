import { createFeatureSelector, createSelector } from '@ngrx/store';
import { MatchHistoryState } from './match-history.reducer';

export const matchHistoryFeatureKey = 'matchHistory';

export const selectMatchHistoryState =
  createFeatureSelector<MatchHistoryState>(matchHistoryFeatureKey);

export const selectMatchHistory = createSelector(selectMatchHistoryState, (state) => state.data);
export const selectMatchHistoryIsLoading = createSelector(
  selectMatchHistoryState,
  (state) => state.isLoading,
);
export const selectMatchHistoryError = createSelector(
  selectMatchHistoryState,
  (state) => state.error,
);
