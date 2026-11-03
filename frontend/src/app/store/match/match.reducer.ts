import { createReducer, on } from '@ngrx/store';
import { ApiCall, ApiCallStatus } from 'src/app/models/api-call.model';
import { Nullable } from 'src/app/models/nullable.model';
import { PlayerMatchDto } from 'src/app/models/player-match.model';
import { TeamScoreUpdate } from 'src/app/models/score-update.model';
import { INITIAL_SCORE_SYNC, ScoreSync } from 'src/app/models/score-sync.model';
import { wsMatchUpdated } from 'src/app/store/realtime/realtime.actions';
import { resetTournament } from 'src/app/store/tournament/tournament.actions';
import {
  adminUpdateScore,
  adminUpdateScoreFailure,
  adminUpdateScoreSuccess,
  loadCurrentMatch,
  loadCurrentMatchFailure,
  loadCurrentMatchSuccess,
  startMatch,
  startMatchFailure,
  startMatchSuccess,
  updateScore,
  scoreSyncBadgeExpired,
  updateScoreFailure,
  updateScoreSuccess,
  validateMatch,
  validateMatchFailure,
  validateMatchSuccess,
} from './match.actions';

export interface ScoreRequest {
  startMatch: ApiCallStatus;
  updateScore: ApiCallStatus;
  validateMatch: ApiCallStatus;
  adminUpdateScore: ApiCallStatus;
}

export interface MatchState {
  data: ApiCall<Nullable<PlayerMatchDto>>;
  scoreRequest: ScoreRequest;
  scoreSync: ScoreSync<TeamScoreUpdate>;
}

const initialScoreRequest: ScoreRequest = {
  startMatch: { isLoading: false, error: null },
  updateScore: { isLoading: false, error: null },
  validateMatch: { isLoading: false, error: null },
  adminUpdateScore: { isLoading: false, error: null },
};

export const initialMatchState: MatchState = {
  data: { data: null, isLoading: false, error: null },
  scoreRequest: initialScoreRequest,
  scoreSync: INITIAL_SCORE_SYNC,
};

export const matchReducer = createReducer(
  initialMatchState,
  on(loadCurrentMatch, (state) => ({
    ...state,
    data: { ...state.data, isLoading: true, error: null },
  })),
  on(loadCurrentMatchSuccess, (state, { match }) => ({
    ...state,
    data: { data: match, isLoading: false, error: null },
  })),
  on(loadCurrentMatchFailure, (state, { error }) => ({
    ...state,
    data: { ...state.data, isLoading: false, error },
  })),
  on(wsMatchUpdated, (state, { match }) => ({
    ...state,
    data: {
      ...state.data,
      data: isCurrentOrNewerMatch(state.data.data, match) ? match : state.data.data,
    },
  })),
  on(startMatch, (state) => ({
    ...state,
    scoreRequest: { ...state.scoreRequest, startMatch: { isLoading: true, error: null } },
  })),
  on(startMatchSuccess, (state) => ({
    ...state,
    scoreRequest: { ...state.scoreRequest, startMatch: { isLoading: false, error: null } },
  })),
  on(startMatchFailure, (state, { error }) => ({
    ...state,
    scoreRequest: { ...state.scoreRequest, startMatch: { isLoading: false, error } },
  })),
  on(updateScore, (state) => ({
    ...state,
    scoreRequest: { ...state.scoreRequest, updateScore: { isLoading: true, error: null } },
  })),
  on(updateScoreSuccess, (state) => {
    const { pending } = state.scoreSync;
    const current = state.data.data;
    return {
      ...state,
      // The resent score is now the server's: shown in the card until the match update arrives,
      // instead of flashing back to the score loaded during the outage.
      data:
        pending && current?.id === pending.matchId
          ? { ...state.data, data: { ...current, scoreA: pending.scoreA, scoreB: pending.scoreB } }
          : state.data,
      scoreRequest: { ...state.scoreRequest, updateScore: { isLoading: false, error: null } },
      scoreSync: pending ? { status: 'synced' as const, pending: null } : state.scoreSync,
    };
  }),
  on(updateScoreFailure, (state, { error, request, offline }) => ({
    ...state,
    // No network: the score is kept and resent, the badge says so instead of an error.
    scoreRequest: {
      ...state.scoreRequest,
      updateScore: { isLoading: false, error: offline ? null : error },
    },
    scoreSync: offline
      ? { status: 'pending' as const, pending: request }
      : { status: 'idle' as const, pending: null },
  })),
  on(scoreSyncBadgeExpired, (state) => ({
    ...state,
    scoreSync: state.scoreSync.status === 'synced' ? INITIAL_SCORE_SYNC : state.scoreSync,
  })),
  on(validateMatch, (state) => ({
    ...state,
    scoreRequest: { ...state.scoreRequest, validateMatch: { isLoading: true, error: null } },
  })),
  on(validateMatchSuccess, (state) => ({
    ...state,
    scoreRequest: { ...state.scoreRequest, validateMatch: { isLoading: false, error: null } },
  })),
  on(validateMatchFailure, (state, { error }) => ({
    ...state,
    scoreRequest: { ...state.scoreRequest, validateMatch: { isLoading: false, error } },
  })),
  on(adminUpdateScore, (state) => ({
    ...state,
    scoreRequest: { ...state.scoreRequest, adminUpdateScore: { isLoading: true, error: null } },
  })),
  on(adminUpdateScoreSuccess, (state) => ({
    ...state,
    scoreRequest: { ...state.scoreRequest, adminUpdateScore: { isLoading: false, error: null } },
  })),
  on(adminUpdateScoreFailure, (state, { error }) => ({
    ...state,
    scoreRequest: { ...state.scoreRequest, adminUpdateScore: { isLoading: false, error } },
  })),
  on(resetTournament, () => initialMatchState),
);

/**
 * An admin correcting a match of a previous session broadcasts it to both teams: it must not take
 * the place of the match they are playing. Only the same match, or one of a newer session (the
 * next session's match), replaces the current one.
 */
export function isCurrentOrNewerMatch(
  current: Nullable<PlayerMatchDto>,
  incoming: PlayerMatchDto,
): boolean {
  return (
    !current ||
    current.id === incoming.id ||
    incoming.session.sessionNumber > current.session.sessionNumber
  );
}
