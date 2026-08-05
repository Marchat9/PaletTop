import { createAction, props } from '@ngrx/store';
import { MatchHistoryDto } from 'src/app/models/player-match.model';

export const loadMatchHistory = createAction(
  '[MatchHistory] Load Match History',
  props<{ tournamentCode: string; teamCode: string }>(),
);
export const loadMatchHistorySuccess = createAction(
  '[MatchHistory] Load Match History Success',
  props<{ history: MatchHistoryDto[] }>(),
);
export const loadMatchHistoryFailure = createAction(
  '[MatchHistory] Load Match History Failure',
  props<{ error: string }>(),
);
