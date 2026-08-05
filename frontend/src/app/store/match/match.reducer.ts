import { createReducer, on } from '@ngrx/store';
import { ApiCall, ApiCallStatus } from 'src/app/models/api-call.model';
import { Nullable } from 'src/app/models/nullable.model';
import { PlayerMatchDto } from 'src/app/models/player-match.model';
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
      data: match,
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
  on(updateScoreSuccess, (state) => ({
    ...state,
    scoreRequest: { ...state.scoreRequest, updateScore: { isLoading: false, error: null } },
  })),
  on(updateScoreFailure, (state, { error }) => ({
    ...state,
    scoreRequest: { ...state.scoreRequest, updateScore: { isLoading: false, error } },
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
