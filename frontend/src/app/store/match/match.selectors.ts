import { createFeatureSelector, createSelector } from '@ngrx/store';
import { MatchState } from './match.reducer';

export const matchFeatureKey = 'match';

export const selectMatchState = createFeatureSelector<MatchState>(matchFeatureKey);

export const selectCurrentMatch = createSelector(selectMatchState, (state) => state.data.data);
export const selectCurrentMatchIsLoading = createSelector(
  selectMatchState,
  (state) => state.data.isLoading,
);
export const selectCurrentMatchError = createSelector(
  selectMatchState,
  (state) => state.data.error,
);

export const selectStartMatchLoading = createSelector(
  selectMatchState,
  (state) => state.scoreRequest.startMatch.isLoading,
);
export const selectStartMatchError = createSelector(
  selectMatchState,
  (state) => state.scoreRequest.startMatch.error,
);
export const selectUpdateScoreLoading = createSelector(
  selectMatchState,
  (state) => state.scoreRequest.updateScore.isLoading,
);
export const selectUpdateScoreError = createSelector(
  selectMatchState,
  (state) => state.scoreRequest.updateScore.error,
);
export const selectValidateMatchLoading = createSelector(
  selectMatchState,
  (state) => state.scoreRequest.validateMatch.isLoading,
);
export const selectValidateMatchError = createSelector(
  selectMatchState,
  (state) => state.scoreRequest.validateMatch.error,
);
export const selectAdminUpdateScoreLoading = createSelector(
  selectMatchState,
  (state) => state.scoreRequest.adminUpdateScore.isLoading,
);
export const selectAdminUpdateScoreError = createSelector(
  selectMatchState,
  (state) => state.scoreRequest.adminUpdateScore.error,
);
