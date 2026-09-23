import { createAction, props } from '@ngrx/store';
import { TrainingRoundDto } from './training.models';

// --------- Generate next round ---------
export const generateTrainingRound = createAction(
  '[Training] Generate Training Round',
  props<{ sessionCode: string }>(),
);
export const generateTrainingRoundSuccess = createAction(
  '[Training] Generate Training Round Success',
  props<{ round: TrainingRoundDto }>(),
);
export const generateTrainingRoundFailure = createAction(
  '[Training] Generate Training Round Failure',
  props<{ error: string }>(),
);
// -------------------------------------------------------

// --------- List rounds ---------
export const loadTrainingRounds = createAction(
  '[Training] Load Training Rounds',
  props<{ sessionCode: string }>(),
);
export const loadTrainingRoundsSuccess = createAction(
  '[Training] Load Training Rounds Success',
  props<{ rounds: TrainingRoundDto[] }>(),
);
export const loadTrainingRoundsFailure = createAction(
  '[Training] Load Training Rounds Failure',
  props<{ error: string }>(),
);
// -------------------------------------------------------

// --------- Get a single round ---------
export const loadTrainingRound = createAction(
  '[Training] Load Training Round',
  props<{ sessionCode: string; roundNumber: number }>(),
);
export const loadTrainingRoundSuccess = createAction(
  '[Training] Load Training Round Success',
  props<{ round: TrainingRoundDto }>(),
);
export const loadTrainingRoundFailure = createAction(
  '[Training] Load Training Round Failure',
  props<{ error: string }>(),
);
// -------------------------------------------------------
