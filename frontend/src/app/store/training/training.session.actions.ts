import { createAction, props } from '@ngrx/store';
import {
  TrainingLeaderboardEntryDto,
  TrainingSessionAdminDto,
  TrainingSessionConfigurationDto,
  TrainingSessionPublicDto,
  TrainingSessionSummaryDto,
} from './training.models';

// --------- Create Training Session ---------
export const createTrainingSession = createAction(
  '[Training] Create Training Session',
  props<{ trainingCode: string; configuration: TrainingSessionConfigurationDto }>(),
);
export const createTrainingSessionSuccess = createAction(
  '[Training] Create Training Session Success',
  props<{ session: TrainingSessionAdminDto }>(),
);
export const createTrainingSessionFailure = createAction(
  '[Training] Create Training Session Failure',
  props<{ error: string }>(),
);
// -------------------------------------------------------

// --------- List Training Sessions ---------
export const loadTrainingSessions = createAction(
  '[Training] Load Training Sessions',
  props<{ trainingCode: string }>(),
);
export const loadTrainingSessionsSuccess = createAction(
  '[Training] Load Training Sessions Success',
  props<{ sessions: TrainingSessionSummaryDto[] }>(),
);
export const loadTrainingSessionsFailure = createAction(
  '[Training] Load Training Sessions Failure',
  props<{ error: string }>(),
);
// -------------------------------------------------------

// --------- Load Training Session (public) ---------
export const loadTrainingSessionPublic = createAction(
  '[Training] Load Training Session Public',
  props<{ sessionCode: string }>(),
);
export const loadTrainingSessionPublicSuccess = createAction(
  '[Training] Load Training Session Public Success',
  props<{ session: TrainingSessionPublicDto }>(),
);
export const loadTrainingSessionPublicFailure = createAction(
  '[Training] Load Training Session Public Failure',
  props<{ error: string }>(),
);
// -------------------------------------------------------

// --------- Load the settings of a past session ---------
// Read-only, and deliberately separate from the admin connection: it must not take over the
// session on screen, nor open a websocket on a session the admin is not running.
export const loadTrainingSessionSettings = createAction(
  '[Training] Load Training Session Settings',
  props<{ sessionCode: string }>(),
);
export const loadTrainingSessionSettingsSuccess = createAction(
  '[Training] Load Training Session Settings Success',
  props<{ session: TrainingSessionAdminDto }>(),
);
export const loadTrainingSessionSettingsFailure = createAction(
  '[Training] Load Training Session Settings Failure',
  props<{ error: string }>(),
);
// -------------------------------------------------------

// --------- Connect to a Training Session as admin ---------
export const connectTrainingSessionAdministrator = createAction(
  '[Training] Connect Training Session Administrator',
  props<{ sessionCode: string }>(),
);
export const connectTrainingSessionAdministratorSuccess = createAction(
  '[Training] Connect Training Session Administrator Success',
  props<{ session: TrainingSessionAdminDto }>(),
);
export const connectTrainingSessionAdministratorFailure = createAction(
  '[Training] Connect Training Session Administrator Failure',
  props<{ error: string }>(),
);
// -------------------------------------------------------

// --------- Close Training Session ---------
export const closeTrainingSession = createAction(
  '[Training] Close Training Session',
  props<{ sessionCode: string }>(),
);
export const closeTrainingSessionSuccess = createAction(
  '[Training] Close Training Session Success',
  props<{ session: TrainingSessionAdminDto }>(),
);
export const closeTrainingSessionFailure = createAction(
  '[Training] Close Training Session Failure',
  props<{ error: string }>(),
);
// -------------------------------------------------------

// --------- Checkin participant ---------
export const checkinTrainingParticipant = createAction(
  '[Training] Checkin Training Participant',
  props<{ sessionCode: string; memberId?: string; name?: string }>(),
);
export const checkinTrainingParticipantSuccess = createAction(
  '[Training] Checkin Training Participant Success',
  props<{ session: TrainingSessionAdminDto }>(),
);
export const checkinTrainingParticipantFailure = createAction(
  '[Training] Checkin Training Participant Failure',
  props<{ error: string }>(),
);
// Closes the banner showing the code of the last participant checked in.
export const dismissTrainingCheckinHandoff = createAction(
  '[Training] Dismiss Training Checkin Handoff',
);

// Leaves the control page: closes the socket of the session.
export const leaveTrainingSession = createAction('[Training] Leave Training Session');
// -------------------------------------------------------

// --------- Remove participant ---------
export const removeTrainingParticipant = createAction(
  '[Training] Remove Training Participant',
  props<{ sessionCode: string; participantId: string }>(),
);
export const removeTrainingParticipantSuccess = createAction(
  '[Training] Remove Training Participant Success',
  props<{ session: TrainingSessionAdminDto }>(),
);
export const removeTrainingParticipantFailure = createAction(
  '[Training] Remove Training Participant Failure',
  props<{ error: string }>(),
);
// -------------------------------------------------------

// --------- Leaderboard ---------
export const loadTrainingLeaderboard = createAction(
  '[Training] Load Training Leaderboard',
  props<{ sessionCode: string }>(),
);
export const loadTrainingLeaderboardSuccess = createAction(
  '[Training] Load Training Leaderboard Success',
  props<{ leaderboard: TrainingLeaderboardEntryDto[] }>(),
);
export const loadTrainingLeaderboardFailure = createAction(
  '[Training] Load Training Leaderboard Failure',
  props<{ error: string }>(),
);
// -------------------------------------------------------
