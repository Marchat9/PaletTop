import { describe, expect, it } from 'vitest';
import { updateLocalStorageData } from '../app-config/app-config.actions';
import { STORAGE_FRIENDLY_MATCH_KEY } from '../app-config/app-config.effects';
import { resetFriendlyMatch, setTeam1Name, startNextMatch } from './friendly-match.actions';
import {
  FriendlyMatchState,
  friendlyMatchReducer,
  initialFriendlyMatchState,
} from './friendly-match.reducer';

const SAVED_STATE: FriendlyMatchState = {
  team1Name: 'Les Rouges',
  team2Name: 'Les Bleus',
  targetScore: 21,
  team1Score: 5,
  team2Score: 3,
  matchHistory: [{ team1Name: 'Rouge', team2Name: 'Bleu', team1Score: 21, team2Score: 10 }],
};

describe('friendlyMatchReducer', () => {
  it('returns the initial state for an unknown action', () => {
    expect(friendlyMatchReducer(undefined, { type: '@@INIT' })).toEqual(initialFriendlyMatchState);
  });

  it('restores the saved match from localStorage data on updateLocalStorageData', () => {
    const state = friendlyMatchReducer(
      initialFriendlyMatchState,
      updateLocalStorageData({ data: { [STORAGE_FRIENDLY_MATCH_KEY]: SAVED_STATE } }),
    );
    expect(state).toEqual(SAVED_STATE);
  });

  it('ignores updateLocalStorageData when it carries no saved friendly match', () => {
    const state = friendlyMatchReducer(
      initialFriendlyMatchState,
      updateLocalStorageData({ data: { 'tournament-code': 'ABC123' } }),
    );
    expect(state).toEqual(initialFriendlyMatchState);
  });

  it('resets to the initial state on resetFriendlyMatch', () => {
    const started = friendlyMatchReducer(
      friendlyMatchReducer(initialFriendlyMatchState, setTeam1Name({ name: 'Les Rouges' })),
      startNextMatch(),
    );

    expect(friendlyMatchReducer(started, resetFriendlyMatch())).toEqual(initialFriendlyMatchState);
  });
});
