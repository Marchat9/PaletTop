import { createFeatureSelector, createSelector } from '@ngrx/store';
import { SessionState } from './session.reducer';

export const sessionFeatureKey = 'session';

export const selectSessionState = createFeatureSelector<SessionState>(sessionFeatureKey);

export const selectSessions = createSelector(selectSessionState, (state) => state.data.data);
