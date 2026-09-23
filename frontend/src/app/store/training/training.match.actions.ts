import { createAction, props } from '@ngrx/store';
import { TrainingMatchDto } from './training.models';

// --------- Start match ---------
export const startTrainingMatch = createAction(
  '[Training] Start Training Match',
  props<{ sessionCode: string; matchId: string; participantCode: string }>(),
);
export const startTrainingMatchSuccess = createAction(
  '[Training] Start Training Match Success',
  props<{ match: TrainingMatchDto }>(),
);
export const startTrainingMatchFailure = createAction(
  '[Training] Start Training Match Failure',
  props<{ error: string }>(),
);
// -------------------------------------------------------

// --------- Update score ---------
export const updateTrainingScore = createAction(
  '[Training] Update Training Score',
  props<{
    sessionCode: string;
    matchId: string;
    participantCode: string;
    scoreA: number;
    scoreB: number;
  }>(),
);
export const updateTrainingScoreSuccess = createAction(
  '[Training] Update Training Score Success',
  props<{ match: TrainingMatchDto }>(),
);
export const updateTrainingScoreFailure = createAction(
  '[Training] Update Training Score Failure',
  props<{ error: string }>(),
);
// -------------------------------------------------------

// --------- Validate match ---------
export const validateTrainingMatch = createAction(
  '[Training] Validate Training Match',
  props<{
    sessionCode: string;
    matchId: string;
    participantCode: string;
    opponentParticipantCode: string;
  }>(),
);
export const validateTrainingMatchSuccess = createAction(
  '[Training] Validate Training Match Success',
  props<{ match: TrainingMatchDto }>(),
);
export const validateTrainingMatchFailure = createAction(
  '[Training] Validate Training Match Failure',
  props<{ error: string }>(),
);
// -------------------------------------------------------

// --------- Admin update score ---------
export const adminUpdateTrainingScore = createAction(
  '[Training] Admin Update Training Score',
  props<{ sessionCode: string; matchId: string; scoreA: number; scoreB: number }>(),
);
export const adminUpdateTrainingScoreSuccess = createAction(
  '[Training] Admin Update Training Score Success',
  props<{ match: TrainingMatchDto }>(),
);
export const adminUpdateTrainingScoreFailure = createAction(
  '[Training] Admin Update Training Score Failure',
  props<{ error: string }>(),
);
// -------------------------------------------------------
