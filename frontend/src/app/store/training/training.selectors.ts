import { createFeatureSelector, createSelector } from '@ngrx/store';
import { TrainingState } from './training.models';

export const trainingFeatureKey = 'Training';

export const selectTrainingState = createFeatureSelector<TrainingState>(trainingFeatureKey);

// ---------- Training (roster) ----------
export const selectCurrentTraining = createSelector(selectTrainingState, (state) => state.training);
export const selectCurrentTrainingData = createSelector(
  selectTrainingState,
  (state) => state.training.data,
);
export const selectCurrentTrainingIsLoading = createSelector(
  selectTrainingState,
  (state) => state.training.isLoading,
);
export const selectCurrentTrainingError = createSelector(
  selectTrainingState,
  (state) => state.training.error,
);

// ---------- Training admin informations ----------
export const selectCurrentTrainingAdminInformations = createSelector(
  selectTrainingState,
  (state) => state.adminInformations,
);

export const selectLastRequestedTrainingCode = createSelector(
  selectTrainingState,
  (state) => state.lastRequestedCode,
);

// ---------- Training creation ----------
export const selectTrainingCreationIsLoading = createSelector(
  selectTrainingState,
  (state) => state.requestStatus.trainingCreation.isLoading,
);
export const selectTrainingCreationError = createSelector(
  selectTrainingState,
  (state) => state.requestStatus.trainingCreation.error,
);

// ---------- Update training informations ----------
export const selectUpdateTrainingLoading = createSelector(
  selectTrainingState,
  (state) => state.requestStatus.updateTraining.isLoading,
);
export const selectUpdateTrainingError = createSelector(
  selectTrainingState,
  (state) => state.requestStatus.updateTraining.error,
);

// ---------- Add / remove member ----------
export const selectAddTrainingMemberLoading = createSelector(
  selectTrainingState,
  (state) => state.requestStatus.addMember.isLoading,
);
export const selectAddTrainingMemberError = createSelector(
  selectTrainingState,
  (state) => state.requestStatus.addMember.error,
);
export const selectRemoveTrainingMemberLoading = createSelector(
  selectTrainingState,
  (state) => state.requestStatus.removeMember.isLoading,
);
export const selectRemoveTrainingMemberError = createSelector(
  selectTrainingState,
  (state) => state.requestStatus.removeMember.error,
);

// ---------- Sessions list ----------
export const selectTrainingSessions = createSelector(
  selectTrainingState,
  (state) => state.sessions.data,
);
export const selectTrainingSessionsIsLoading = createSelector(
  selectTrainingState,
  (state) => state.sessions.isLoading,
);
export const selectTrainingSessionsError = createSelector(
  selectTrainingState,
  (state) => state.sessions.error,
);
export const selectCreateTrainingSessionLoading = createSelector(
  selectTrainingState,
  (state) => state.requestStatus.createSession.isLoading,
);
export const selectCreateTrainingSessionError = createSelector(
  selectTrainingState,
  (state) => state.requestStatus.createSession.error,
);

// ---------- Current session ----------
export const selectCurrentTrainingSession = createSelector(
  selectTrainingState,
  (state) => state.currentSession,
);
export const selectCurrentTrainingSessionData = createSelector(
  selectTrainingState,
  (state) => state.currentSession.data,
);
export const selectCurrentTrainingSessionIsLoading = createSelector(
  selectTrainingState,
  (state) => state.currentSession.isLoading,
);
export const selectCurrentTrainingSessionError = createSelector(
  selectTrainingState,
  (state) => state.currentSession.error,
);
export const selectCloseTrainingSessionLoading = createSelector(
  selectTrainingState,
  (state) => state.requestStatus.closeSession.isLoading,
);
export const selectCloseTrainingSessionError = createSelector(
  selectTrainingState,
  (state) => state.requestStatus.closeSession.error,
);

// ---------- Checkin / remove participant ----------
export const selectCheckinTrainingParticipantLoading = createSelector(
  selectTrainingState,
  (state) => state.requestStatus.checkinParticipant.isLoading,
);
export const selectCheckinTrainingParticipantError = createSelector(
  selectTrainingState,
  (state) => state.requestStatus.checkinParticipant.error,
);
export const selectRemoveTrainingParticipantLoading = createSelector(
  selectTrainingState,
  (state) => state.requestStatus.removeParticipant.isLoading,
);
export const selectRemoveTrainingParticipantError = createSelector(
  selectTrainingState,
  (state) => state.requestStatus.removeParticipant.error,
);

// ---------- Leaderboard ----------
export const selectTrainingLeaderboard = createSelector(
  selectTrainingState,
  (state) => state.leaderboard.data,
);
export const selectTrainingLeaderboardIsLoading = createSelector(
  selectTrainingState,
  (state) => state.leaderboard.isLoading,
);
export const selectTrainingLeaderboardError = createSelector(
  selectTrainingState,
  (state) => state.leaderboard.error,
);

// ---------- Teams ----------
export const selectCreateTrainingTeamLoading = createSelector(
  selectTrainingState,
  (state) => state.requestStatus.createTeam.isLoading,
);
export const selectCreateTrainingTeamError = createSelector(
  selectTrainingState,
  (state) => state.requestStatus.createTeam.error,
);
export const selectDissolveTrainingTeamLoading = createSelector(
  selectTrainingState,
  (state) => state.requestStatus.dissolveTeam.isLoading,
);
export const selectDissolveTrainingTeamError = createSelector(
  selectTrainingState,
  (state) => state.requestStatus.dissolveTeam.error,
);

// ---------- Rounds ----------
export const selectTrainingRounds = createSelector(
  selectTrainingState,
  (state) => state.rounds.data,
);
export const selectTrainingRoundsIsLoading = createSelector(
  selectTrainingState,
  (state) => state.rounds.isLoading,
);
export const selectTrainingRoundsError = createSelector(
  selectTrainingState,
  (state) => state.rounds.error,
);
export const selectCurrentTrainingRound = createSelector(
  selectTrainingState,
  (state) => state.currentRound.data,
);
export const selectCurrentTrainingRoundIsLoading = createSelector(
  selectTrainingState,
  (state) => state.currentRound.isLoading,
);
export const selectCurrentTrainingRoundError = createSelector(
  selectTrainingState,
  (state) => state.currentRound.error,
);
export const selectGenerateTrainingRoundLoading = createSelector(
  selectTrainingState,
  (state) => state.requestStatus.generateRound.isLoading,
);
export const selectGenerateTrainingRoundError = createSelector(
  selectTrainingState,
  (state) => state.requestStatus.generateRound.error,
);

// ---------- Matches / score ----------
export const selectStartTrainingMatchLoading = createSelector(
  selectTrainingState,
  (state) => state.requestStatus.startMatch.isLoading,
);
export const selectStartTrainingMatchError = createSelector(
  selectTrainingState,
  (state) => state.requestStatus.startMatch.error,
);
export const selectUpdateTrainingScoreLoading = createSelector(
  selectTrainingState,
  (state) => state.requestStatus.updateScore.isLoading,
);
export const selectUpdateTrainingScoreError = createSelector(
  selectTrainingState,
  (state) => state.requestStatus.updateScore.error,
);
export const selectValidateTrainingMatchLoading = createSelector(
  selectTrainingState,
  (state) => state.requestStatus.validateMatch.isLoading,
);
export const selectValidateTrainingMatchError = createSelector(
  selectTrainingState,
  (state) => state.requestStatus.validateMatch.error,
);
export const selectAdminUpdateTrainingScoreLoading = createSelector(
  selectTrainingState,
  (state) => state.requestStatus.adminUpdateScore.isLoading,
);
export const selectAdminUpdateTrainingScoreError = createSelector(
  selectTrainingState,
  (state) => state.requestStatus.adminUpdateScore.error,
);

// ---------- Participant view (player) ----------
export const selectTrainingParticipantCurrentMatch = createSelector(
  selectTrainingState,
  (state) => state.participantCurrentMatch.data,
);
export const selectTrainingParticipantCurrentMatchIsLoading = createSelector(
  selectTrainingState,
  (state) => state.participantCurrentMatch.isLoading,
);
export const selectTrainingParticipantCurrentMatchError = createSelector(
  selectTrainingState,
  (state) => state.participantCurrentMatch.error,
);
export const selectTrainingParticipantHistory = createSelector(
  selectTrainingState,
  (state) => state.participantHistory.data,
);
export const selectTrainingParticipantHistoryIsLoading = createSelector(
  selectTrainingState,
  (state) => state.participantHistory.isLoading,
);
export const selectTrainingParticipantHistoryError = createSelector(
  selectTrainingState,
  (state) => state.participantHistory.error,
);
