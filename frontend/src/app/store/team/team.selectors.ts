import { createFeatureSelector, createSelector } from '@ngrx/store';
import { TeamState } from './team.reducer';

export const teamFeatureKey = 'team';

export const selectTeamState = createFeatureSelector<TeamState>(teamFeatureKey);

export const selectTeam = createSelector(selectTeamState, (state) => state.data);
export const selectTeamData = createSelector(selectTeamState, (state) => state.data.data);
export const selectTeamIsLoading = createSelector(selectTeamState, (state) => state.data.isLoading);
export const selectTeamError = createSelector(selectTeamState, (state) => state.data.error);
