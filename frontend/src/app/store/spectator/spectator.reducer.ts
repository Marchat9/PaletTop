import { createReducer, on } from '@ngrx/store';
import {
  wsMatchUpdated,
  wsRankingUpdated,
  wsSessionUpdated,
  wsTournamentUpdated,
} from 'src/app/store/realtime/realtime.actions';
import {
  loadSpectatorTournament,
  loadSpectatorTournamentFailure,
  loadSpectatorTournamentSuccess,
  resetSpectator,
} from './spectator.actions';
import { SpectatorState } from './spectator.models';

export const initialSpectatorState: SpectatorState = {
  tournament: { data: null, isLoading: false, error: null },
  sessions: [],
  ranking: [],
};

export const spectatorReducer = createReducer(
  initialSpectatorState,

  on(loadSpectatorTournament, (state) => ({
    ...state,
    tournament: { ...state.tournament, isLoading: true },
  })),
  on(loadSpectatorTournamentSuccess, (state, { tournament, sessions, ranking }) => ({
    ...state,
    tournament: { data: tournament, isLoading: false, error: null },
    sessions,
    ranking,
  })),
  on(loadSpectatorTournamentFailure, (state, { error }) => ({
    ...state,
    tournament: { ...state.tournament, isLoading: false, error },
  })),
  on(resetSpectator, () => initialSpectatorState),

  on(wsTournamentUpdated, (state, { tournament }) => ({
    ...state,
    tournament: {
      ...state.tournament,
      data: state.tournament.data
        ? {
            ...state.tournament.data,
            status: tournament.status,
            phaseName: tournament.tournamentStatus?.phaseName ?? '',
          }
        : state.tournament.data,
    },
  })),
  on(wsRankingUpdated, (state, { ranking }) => ({
    ...state,
    ranking,
  })),
  on(wsSessionUpdated, (state, { session }) => {
    const exists = state.sessions.some((s) => s.id === session.id);
    return {
      ...state,
      sessions: exists
        ? state.sessions.map((s) => (s.id === session.id ? session : s))
        : [...state.sessions, session],
    };
  }),
  on(wsMatchUpdated, (state, { match }) => ({
    ...state,
    sessions: state.sessions.map((session) =>
      session.id !== match.session.id
        ? session
        : {
            ...session,
            matches: session.matches.map((m) =>
              m.id !== match.id
                ? m
                : {
                    ...m,
                    status: match.status,
                    scoreA: match.scoreA,
                    scoreB: match.scoreB,
                    startedAt: match.startedAt,
                    finishedAt: match.finishedAt,
                    duration: match.duration,
                  },
            ),
          },
    ),
  })),
);
