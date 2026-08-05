import { createReducer, on } from '@ngrx/store';
import { ApiCall } from 'src/app/models/api-call.model';
import { GlobalRankingEntry } from 'src/app/models/global-ranking.model';
import { resetTournament } from 'src/app/store/tournament/tournament.actions';
import { wsRankingUpdated } from 'src/app/store/realtime/realtime.actions';
import {
  loadRanking,
  loadRankingFailure,
  loadRankingSuccess,
  resetRankingTournament,
} from './ranking.actions';

export interface RankingState {
  data: ApiCall<GlobalRankingEntry[]>;
}

export const initialRankingState: RankingState = {
  data: { data: [], isLoading: false, error: null },
};

export const rankingReducer = createReducer(
  initialRankingState,
  on(loadRanking, (state) => ({
    ...state,
    data: { ...state.data, isLoading: true, error: null },
  })),
  on(loadRankingSuccess, (state, { ranking }) => ({
    ...state,
    data: { data: ranking, isLoading: false, error: null },
  })),
  on(loadRankingFailure, (state, { error }) => ({
    ...state,
    data: { ...state.data, isLoading: false, error },
  })),
  on(resetRankingTournament, () => ({
    ...initialRankingState,
  })),
  on(wsRankingUpdated, (state, { ranking }) => ({
    ...state,
    data: { ...state.data, data: ranking },
  })),
  on(resetTournament, () => initialRankingState),
);
