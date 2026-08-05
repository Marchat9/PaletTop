import { createAction, props } from '@ngrx/store';

export const setTeam1Name = createAction(
  '[FriendlyMatch] Set Team 1 Name',
  props<{ name: string }>(),
);
export const setTeam2Name = createAction(
  '[FriendlyMatch] Set Team 2 Name',
  props<{ name: string }>(),
);
export const setTargetScore = createAction(
  '[FriendlyMatch] Set Target Score',
  props<{ targetScore: number }>(),
);
export const updateTeam1Score = createAction(
  '[FriendlyMatch] Update Team 1 Score',
  props<{ score: number }>(),
);
export const updateTeam2Score = createAction(
  '[FriendlyMatch] Update Team 2 Score',
  props<{ score: number }>(),
);
export const startNextMatch = createAction('[FriendlyMatch] Start Next Match');
export const resetHistoryMatch = createAction('[FriendlyMatch] Reset History Match');
export const resetFriendlyMatch = createAction('[FriendlyMatch] Reset');
