import { createReducer, on } from '@ngrx/store';
import { ApiCall } from 'src/app/models/api-call.model';
import { MatchesSessionDto } from 'src/app/models/matches-session.model';
import { Nullable } from 'src/app/models/nullable.model';
import { resetTournament } from 'src/app/store/tournament/tournament.actions';
import { wsMatchUpdated, wsSessionUpdated } from 'src/app/store/realtime/realtime.actions';
import { loadSessions, loadSessionsFailure, loadSessionsSuccess } from './session.actions';

export interface SessionState {
  data: ApiCall<Nullable<MatchesSessionDto[]>>;
}

export const initialSessionState: SessionState = {
  data: { data: null, isLoading: false, error: null },
};

export const sessionReducer = createReducer(
  initialSessionState,
  on(loadSessions, (state) => ({
    ...state,
    data: { ...state.data, isLoading: true, error: null },
  })),
  on(loadSessionsSuccess, (state, { sessions }) => ({
    ...state,
    data: { data: sessions, isLoading: false, error: null },
  })),
  on(loadSessionsFailure, (state, { error }) => ({
    ...state,
    data: { ...state.data, isLoading: false, error },
  })),
  on(wsSessionUpdated, (state, { session }) => {
    const sessions = state.data.data ?? [];
    const exists = sessions.some((s) => s.id === session.id);
    return {
      ...state,
      data: {
        ...state.data,
        data: exists
          ? sessions.map((s) => (s.id === session.id ? session : s))
          : [...sessions, session],
      },
    };
  }),
  on(wsMatchUpdated, (state, { match }) => {
    const sessions = state.data.data;
    if (!sessions) return state;
    return {
      ...state,
      data: {
        ...state.data,
        data: sessions.map((s) =>
          s.id === match.session.id
            ? {
                ...s,
                matches: s.matches.map((m) =>
                  m.id === match.id
                    ? {
                        ...m,
                        status: match.status,
                        scoreA: match.scoreA,
                        scoreB: match.scoreB,
                        startedAt: match.startedAt,
                        finishedAt: match.finishedAt,
                        duration: match.duration,
                      }
                    : m,
                ),
              }
            : s,
        ),
      },
    };
  }),
  on(resetTournament, () => initialSessionState),
);
