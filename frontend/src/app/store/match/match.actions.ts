import { createAction, props } from '@ngrx/store';
import { PlayerMatchDto } from 'src/app/models/player-match.model';
import { Nullable } from 'src/app/models/nullable.model';
import { ScoreUpdate, TeamScoreUpdate } from 'src/app/models/score-update.model';
import { ValidateMatch } from 'src/app/models/match-validate-score.model';
import { StartMatch } from 'src/app/models/start-match.model';

export const loadCurrentMatch = createAction(
  '[Match] Load Current Match',
  props<{ tournamentCode: string; teamCode: string }>(),
);
export const loadCurrentMatchSuccess = createAction(
  '[Match] Load Current Match Success',
  props<{ match: Nullable<PlayerMatchDto> }>(),
);
export const loadCurrentMatchFailure = createAction(
  '[Match] Load Current Match Failure',
  props<{ error: string }>(),
);

// --------- Start Match (player) ---------
export const startMatch = createAction('[Tournament Match] Start Match', props<StartMatch>());
export const startMatchSuccess = createAction('[Tournament Match] Start Match Success');
export const startMatchFailure = createAction(
  '[Tournament Match] Start Match Failure',
  props<{ error: string }>(),
);
// ------------------------------------

// --------- Update Score (player) ---------
export const updateScore = createAction(
  '[Tournament Match] Update Score',
  props<TeamScoreUpdate>(),
);
export const updateScoreSuccess = createAction('[Tournament Match] Update Score Success');
export const updateScoreFailure = createAction(
  '[Tournament Match] Update Score Failure',
  props<{ error: string }>(),
);
// ------------------------------------

// --------- Validate Match (player) ---------
export const validateMatch = createAction(
  '[Tournament Match] Validate Match',
  props<ValidateMatch>(),
);
export const validateMatchSuccess = createAction('[Tournament Match] Validate Match Success');
export const validateMatchFailure = createAction(
  '[Tournament Match] Validate Match Failure',
  props<{ error: string }>(),
);
// ------------------------------------

// --------- Admin Update Score ---------
export const adminUpdateScore = createAction(
  '[Tournament Match] Admin Update Score',
  props<ScoreUpdate>(),
);
export const adminUpdateScoreSuccess = createAction(
  '[Tournament Match] Admin Update Score Success',
);
export const adminUpdateScoreFailure = createAction(
  '[Tournament Match] Admin Update Score Failure',
  props<{ error: string }>(),
);
// ------------------------------------
