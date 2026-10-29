import { describe, expect, it } from 'vitest';
import { updateLocalStorageData } from '../app-config/app-config.actions';
import {
  STORAGE_TOURNAMENT_PLAYER_CODE_KEY,
  STORAGE_TOURNAMENT_TEAM_CODE_KEY,
} from '../app-config/app-config.effects';
import {
  forgetTournamentPlayerCodes,
  loadTournamentInformationSuccess,
} from './tournament.actions';
import { TournamentDto } from './tournament.models';
import { initialTournamentState, tournamentReducer } from './tournament.reducer';

describe('tournamentReducer', () => {
  describe('codes du joueur', () => {
    it('les restaure depuis le localStorage', () => {
      const state = tournamentReducer(
        initialTournamentState,
        updateLocalStorageData({
          data: {
            [STORAGE_TOURNAMENT_PLAYER_CODE_KEY]: 'LAITON-2026',
            [STORAGE_TOURNAMENT_TEAM_CODE_KEY]: '4821',
          },
        }),
      );

      expect(state.playerInformations).toEqual({
        tournamentCode: 'LAITON-2026',
        teamCode: '4821',
      });
    });

    it('les retient quand le tournoi accepte l’équipe', () => {
      const state = tournamentReducer(
        initialTournamentState,
        loadTournamentInformationSuccess({
          tournament: { code: 'LAITON-2026' } as TournamentDto,
          teamCode: '4821',
        }),
      );

      expect(state.playerInformations).toEqual({
        tournamentCode: 'LAITON-2026',
        teamCode: '4821',
      });
    });

    it('les oublie quand le serveur les a refusés', () => {
      const before = {
        ...initialTournamentState,
        playerInformations: { tournamentCode: 'LAITON-2026', teamCode: '4821' },
      };

      const state = tournamentReducer(before, forgetTournamentPlayerCodes());

      expect(state.playerInformations).toBeNull();
    });
  });
});
