import { createFeatureSelector, createSelector } from '@ngrx/store';
import { SpectatorState } from './spectator.models';

export const spectatorFeatureKey = 'spectator';

export const selectSpectatorState = createFeatureSelector<SpectatorState>(spectatorFeatureKey);

export const selectSpectatorTournamentData = createSelector(
  selectSpectatorState,
  (state) => state.tournament.data,
);
export const selectSpectatorTournamentIsLoading = createSelector(
  selectSpectatorState,
  (state) => state.tournament.isLoading,
);
export const selectSpectatorTournamentError = createSelector(
  selectSpectatorState,
  (state) => state.tournament.error,
);

export const selectSpectatorSessions = createSelector(
  selectSpectatorState,
  (state) => state.sessions,
);
export const selectSpectatorCurrentSession = createSelector(selectSpectatorSessions, (sessions) =>
  sessions.length === 0
    ? null
    : sessions.reduce((latest, s) => (s.sessionNumber > latest.sessionNumber ? s : latest)),
);

export const selectSpectatorRanking = createSelector(
  selectSpectatorState,
  (state) => state.ranking,
);
