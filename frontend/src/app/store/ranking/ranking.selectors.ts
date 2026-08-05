import { createFeatureSelector, createSelector } from '@ngrx/store';
import { RankingState } from './ranking.reducer';

export const rankingFeatureKey = 'ranking';

export const selectRankingState = createFeatureSelector<RankingState>(rankingFeatureKey);

export const selectRanking = createSelector(selectRankingState, (state) => state.data.data);
export const selectRankingIsLoading = createSelector(
  selectRankingState,
  (state) => state.data.isLoading,
);
export const selectRankingError = createSelector(selectRankingState, (state) => state.data.error);
