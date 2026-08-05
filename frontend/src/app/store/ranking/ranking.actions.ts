import { createAction, props } from '@ngrx/store';
import { GlobalRankingEntry } from 'src/app/models/global-ranking.model';

export const loadRanking = createAction('[Ranking] Load Ranking', props<{ code: string }>());
export const loadRankingSuccess = createAction(
  '[Ranking] Load Ranking Success',
  props<{ ranking: GlobalRankingEntry[] }>(),
);
export const loadRankingFailure = createAction(
  '[Ranking] Load Ranking Failure',
  props<{ error: string }>(),
);

export const resetRankingTournament = createAction('[Ranking] Reset Ranking Tournament');
