import { createAction, props } from '@ngrx/store';
import { MatchesSessionDto } from 'src/app/models/matches-session.model';

export const loadSessions = createAction('[Session] Load Sessions', props<{ code: string }>());
export const loadSessionsSuccess = createAction(
  '[Session] Load Sessions Success',
  props<{ sessions: MatchesSessionDto[] }>(),
);
export const loadSessionsFailure = createAction(
  '[Session] Load Sessions Failure',
  props<{ error: string }>(),
);
