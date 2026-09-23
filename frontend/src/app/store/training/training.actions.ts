import { createAction, props } from '@ngrx/store';
import { AdminTrainingDto, TrainingCurrentMatchDto, TrainingMatchDto } from './training.models';

// ---------------- Training Creation -----------------
export const createTraining = createAction(
  '[Training] Create Training',
  props<{ code: string; name: string; club?: string; adminPassword: string }>(),
);
export const createTrainingSuccess = createAction(
  '[Training] Create Training Success',
  props<{ training: AdminTrainingDto; password: string }>(),
);
export const createTrainingFailure = createAction(
  '[Training] Create Training Failure',
  props<{ error: string }>(),
);
// -------------------------------------------------------

// ----------- Join Training Session as Participant -----------
export const joinTrainingSession = createAction(
  '[Training] Join Training Session',
  props<{ sessionCode: string; participantCode: string }>(),
);
export const joinTrainingSessionSuccess = createAction(
  '[Training] Join Training Session Success',
  props<{ sessionCode: string; participantCode: string; currentMatch: TrainingCurrentMatchDto }>(),
);
export const joinTrainingSessionFailure = createAction(
  '[Training] Join Training Session Failure',
  props<{ error: string }>(),
);
// -------------------------------------------------------

// ----------- Load Training Participant History -----------
export const loadTrainingParticipantHistory = createAction(
  '[Training] Load Training Participant History',
  props<{ sessionCode: string; participantCode: string }>(),
);
export const loadTrainingParticipantHistorySuccess = createAction(
  '[Training] Load Training Participant History Success',
  props<{ history: TrainingMatchDto[] }>(),
);
export const loadTrainingParticipantHistoryFailure = createAction(
  '[Training] Load Training Participant History Failure',
  props<{ error: string }>(),
);
// -------------------------------------------------------

export const resetTraining = createAction('[Training] Reset Training');
export const disconnectTrainingAdministrator = createAction(
  '[Training] Disconnect Training Administrator',
);
