import { createReducer, on } from '@ngrx/store';
import { ApiCall, ApiCallStatus } from 'src/app/models/api-call.model';
import { Nullable } from 'src/app/models/nullable.model';
import { PlayerMatchDto } from 'src/app/models/player-match.model';
import { TournamentStatus } from 'src/app/models/tournament-status.enum';
import { resyncPending, wsMatchUpdated } from 'src/app/store/realtime/realtime.actions';
import {
  loadTournamentInformationSuccess,
  resetTournament,
} from 'src/app/store/tournament/tournament.actions';
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
  updateScoreConflict,
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
  awaitingResync: boolean;
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
  awaitingResync: false,
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
    awaitingResync: false,
    // The match is now the server's: a score that failed to go out before no longer matters.
    scoreRequest: { ...state.scoreRequest, updateScore: { isLoading: false, error: null } },
  })),
  // A failed reload (timeout and retry included) keeps the entry locked: the score shown may be
  // stale. The next resync signal (network, foreground, websocket) tries again.
  on(loadCurrentMatchFailure, (state, { error }) => ({
    ...state,
    data: { ...state.data, isLoading: false, error },
  })),
  // A draft tournament has no match to reload: nothing else would unlock the entry.
  on(loadTournamentInformationSuccess, (state, { tournament }) =>
    tournament.status === TournamentStatus.DRAFT ? { ...state, awaitingResync: false } : state,
  ),
  on(resyncPending, (state) => ({ ...state, awaitingResync: true })),
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
  // The response shows the started match even when the websocket broadcast does not arrive.
  on(startMatchSuccess, (state, { match }) => ({
    ...state,
    data: { ...state.data, data: withMatch(state.data.data, match) },
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
  // The saved score becomes the base of the next entry, without waiting for the broadcast.
  on(updateScoreSuccess, (state, { match }) => ({
    ...state,
    data: {
      ...state.data,
      data: isCurrentOrNewerMatch(state.data.data, match) ? match : state.data.data,
    },
    scoreRequest: { ...state.scoreRequest, updateScore: { isLoading: false, error: null } },
  })),
  on(updateScoreFailure, (state, { error }) => ({
    ...state,
    scoreRequest: { ...state.scoreRequest, updateScore: { isLoading: false, error } },
  })),
  on(updateScoreConflict, (state) => ({
    ...state,
    scoreRequest: { ...state.scoreRequest, updateScore: { isLoading: false, error: null } },
  })),
  on(validateMatch, (state) => ({
    ...state,
    scoreRequest: { ...state.scoreRequest, validateMatch: { isLoading: true, error: null } },
  })),
  on(validateMatchSuccess, (state, { match }) => ({
    ...state,
    data: { ...state.data, data: withMatch(state.data.data, match) },
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
function withMatch(
  current: Nullable<PlayerMatchDto>,
  incoming: PlayerMatchDto,
): Nullable<PlayerMatchDto> {
  return isCurrentOrNewerMatch(current, incoming) ? incoming : current;
}

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
