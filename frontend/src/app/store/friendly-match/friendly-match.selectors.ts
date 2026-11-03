import { createFeatureSelector, createSelector } from '@ngrx/store';
import { FriendlyMatchState } from './friendly-match.reducer';

export const friendlyMatchFeatureKey = 'friendlyMatch';

export const selectFriendlyMatchState =
  createFeatureSelector<FriendlyMatchState>(friendlyMatchFeatureKey);

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

export type FriendlyMatchSide = 'team1' | 'team2';

/**
 * The winning side, decided by the scores. Comparing names failed with empty or identical names,
 * and lowering the target below both scores used to crown team 1 even when it was behind.
 */
export const selectWinnerSide = createSelector(
  selectFriendlyMatchState,
  selectIsMatchFinished,
  (s, isFinished): FriendlyMatchSide | null => {
    if (!isFinished || s.team1Score === s.team2Score) return null;
    return s.team1Score > s.team2Score ? 'team1' : 'team2';
  },
);

/** Name of the winning side, with the same default label as the score board. */
export const selectWinner = createSelector(
  selectFriendlyMatchState,
  selectWinnerSide,
  (s, side) => {
    if (side === 'team1') return s.team1Name || 'Équipe 1';
    if (side === 'team2') return s.team2Name || 'Équipe 2';
    return null;
  },
);
