import { createFeatureSelector, createSelector } from '@ngrx/store';
import { FriendlyMatchState } from './friendly-match.reducer';

export const friendlyMatchFeatureKey = 'friendlyMatch';

const selectFriendlyMatchState = createFeatureSelector<FriendlyMatchState>(friendlyMatchFeatureKey);

export const selectTeam1Name = createSelector(selectFriendlyMatchState, (s) => s.team1Name);
export const selectTeam2Name = createSelector(selectFriendlyMatchState, (s) => s.team2Name);
export const selectTargetScore = createSelector(selectFriendlyMatchState, (s) => s.targetScore);
export const selectTeam1Score = createSelector(selectFriendlyMatchState, (s) => s.team1Score);
export const selectTeam2Score = createSelector(selectFriendlyMatchState, (s) => s.team2Score);
export const selectMatchHistory = createSelector(selectFriendlyMatchState, (s) => s.matchHistory);

export const selectIsMatchFinished = createSelector(
  selectFriendlyMatchState,
  (s) => s.team1Score >= s.targetScore || s.team2Score >= s.targetScore,
);

export const selectWinner = createSelector(
  selectFriendlyMatchState,
  selectIsMatchFinished,
  (s, isFinished) => {
    if (!isFinished) return null;
    return s.team1Score >= s.targetScore ? s.team1Name : s.team2Name;
  },
);
