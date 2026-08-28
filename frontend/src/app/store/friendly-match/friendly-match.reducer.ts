import { createReducer, on } from '@ngrx/store';
import { STORAGE_FRIENDLY_MATCH_KEY } from '../app-config/app-config.effects';
import { updateLocalStorageData } from '../app-config/app-config.actions';
import {
  resetFriendlyMatch,
  resetHistoryMatch,
  setTargetScore,
  setTeam1Name,
  setTeam2Name,
  startNextMatch,
  updateTeam1Score,
  updateTeam2Score,
} from './friendly-match.actions';

export interface FriendlyMatchRecord {
  team1Name: string;
  team2Name: string;
  team1Score: number;
  team2Score: number;
}

export interface FriendlyMatchState {
  team1Name: string;
  team2Name: string;
  targetScore: number;
  team1Score: number;
  team2Score: number;
  matchHistory: FriendlyMatchRecord[];
}

export const initialFriendlyMatchState: FriendlyMatchState = {
  team1Name: 'Équipe 1',
  team2Name: 'Équipe 2',
  targetScore: 13,
  team1Score: 0,
  team2Score: 0,
  matchHistory: [],
};

export const friendlyMatchReducer = createReducer(
  initialFriendlyMatchState,
  on(updateLocalStorageData, (state, { data }) => {
    const saved = data[STORAGE_FRIENDLY_MATCH_KEY];
    return saved && typeof saved === 'object'
      ? { ...state, ...(saved as FriendlyMatchState) }
      : state;
  }),
  on(setTeam1Name, (state, { name }) => ({ ...state, team1Name: name })),
  on(setTeam2Name, (state, { name }) => ({ ...state, team2Name: name })),
  on(setTargetScore, (state, { targetScore }) => ({ ...state, targetScore })),
  on(updateTeam1Score, (state, { score }) => ({ ...state, team1Score: score })),
  on(updateTeam2Score, (state, { score }) => ({ ...state, team2Score: score })),
  on(startNextMatch, (state) => ({
    ...state,
    team1Score: 0,
    team2Score: 0,
    matchHistory: [
      ...state.matchHistory,
      {
        team1Name: state.team1Name,
        team2Name: state.team2Name,
        team1Score: state.team1Score,
        team2Score: state.team2Score,
      },
    ],
  })),
  on(resetHistoryMatch, (state) => ({
    ...state,
    matchHistory: initialFriendlyMatchState.matchHistory,
  })),
  on(resetFriendlyMatch, () => initialFriendlyMatchState),
);
