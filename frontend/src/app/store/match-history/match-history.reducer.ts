import { createReducer, on } from '@ngrx/store';
import { Nullable } from 'src/app/models/nullable.model';
import { MatchHistoryDto } from 'src/app/models/player-match.model';
import { resetTournament } from 'src/app/store/tournament/tournament.actions';
import { wsHistoryUpdated } from 'src/app/store/realtime/realtime.actions';
import {
  loadMatchHistory,
  loadMatchHistoryFailure,
  loadMatchHistorySuccess,
} from './match-history.actions';

export interface MatchHistoryState {
  data: MatchHistoryDto[];
  isLoading: boolean;
  error: Nullable<string>;
}

export const initialMatchHistoryState: MatchHistoryState = {
  data: [],
  isLoading: false,
  error: null,
};

export const matchHistoryReducer = createReducer(
  initialMatchHistoryState,
  on(loadMatchHistory, (state) => ({
    ...state,
    isLoading: true,
    error: null,
  })),
  on(loadMatchHistorySuccess, (state, { history }) => ({
    ...state,
    data: history,
    isLoading: false,
    error: null,
  })),
  on(loadMatchHistoryFailure, (state, { error }) => ({
    ...state,
    isLoading: false,
    error,
  })),
  on(wsHistoryUpdated, (state, { history }) => ({
    ...state,
    data: history,
  })),
  on(resetTournament, () => initialMatchHistoryState),
);
