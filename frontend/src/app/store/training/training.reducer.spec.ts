import { describe, expect, it } from 'vitest';
import { updateLocalStorageData } from '../app-config/app-config.actions';
import {
  STORAGE_TRAINING_SESSION_CODE_KEY,
  STORAGE_TRAINING_SESSION_PLAYER_CODE_KEY,
} from '../app-config/app-config.effects';
import {
  forgetTrainingParticipantCodes,
  loadTrainingParticipantCurrentMatchSuccess,
  resetTraining,
} from './training.actions';
import { checkinTrainingParticipantSuccess } from './training.session.actions';
import {
  TrainingCurrentMatchDto,
  TrainingParticipantAdminDto,
  TrainingSessionAdminDto,
} from './training.models';
import { initialTrainingState, trainingReducer } from './training.reducer';

function buildSession(participants: TrainingParticipantAdminDto[]): TrainingSessionAdminDto {
  return {
    id: 's1',
    code: '1234',
    trainingCode: 'CLUB-1',
    date: '2026-01-01T18:00:00.000Z',
    status: 'OPEN',
    playersPerTeam: 2,
    allowedTeamSizes: [1, 2],
    preferTargetTeamSize: false,
    plateCount: 4,
    teamComposition: 'RANDOM',
    avoidSamePartnerConsecutive: true,
    avoidSameOpponentConsecutive: true,
    pointsPerGame: 13,
    createdAt: '2026-01-01T18:00:00.000Z',
    participants,
    teams: [],
  };
}

const JEAN: TrainingParticipantAdminDto = {
  id: 'p1',
  name: 'Jean Dubois',
  code: '4821',
  status: 'PRESENT',
  memberId: 'member-1',
};

describe('trainingReducer', () => {
  describe('check-in', () => {
    it('désigne le participant inscrit pour que son code lui soit transmis', () => {
      const before = {
        ...initialTrainingState,
        currentSession: { data: buildSession([]), isLoading: false, error: null },
      };

      const state = trainingReducer(
        before,
        checkinTrainingParticipantSuccess({ session: buildSession([JEAN]) }),
      );

      expect(state.lastCheckedInParticipant).toEqual(JEAN);
    });

    // The returning member takes their row back: no new id appears, it is the switch from "left" to
    // "present" that signals the check-in.
    it('désigne aussi le membre qui revient en cours de séance', () => {
      const before = {
        ...initialTrainingState,
        currentSession: {
          data: buildSession([{ ...JEAN, status: 'LEFT' as const }]),
          isLoading: false,
          error: null,
        },
      };

      const state = trainingReducer(
        before,
        checkinTrainingParticipantSuccess({ session: buildSession([JEAN]) }),
      );

      expect(state.lastCheckedInParticipant).toEqual(JEAN);
    });

    it('ne désigne personne quand la séance revient inchangée', () => {
      const before = {
        ...initialTrainingState,
        currentSession: { data: buildSession([JEAN]), isLoading: false, error: null },
      };

      const state = trainingReducer(
        before,
        checkinTrainingParticipantSuccess({ session: buildSession([JEAN]) }),
      );

      expect(state.lastCheckedInParticipant).toBeNull();
    });
  });

  // Switching training must leave nothing of the previous one: sessions, rounds and leaderboard
  // belong to the one being left.
  it('vide les données de séance à la réinitialisation', () => {
    const before = {
      ...initialTrainingState,
      currentSession: { data: buildSession([JEAN]), isLoading: false, error: null },
      leaderboard: {
        data: [{ participantId: 'p1', name: 'Jean Dubois', wins: 2, points: 27 }],
        isLoading: false,
        error: null,
      },
    };

    const state = trainingReducer(before, resetTraining());

    expect(state.currentSession.data).toBeNull();
    expect(state.leaderboard.data).toEqual([]);
    expect(state.rounds.data).toEqual([]);
  });

  describe('codes du joueur', () => {
    it('les restaure depuis le localStorage', () => {
      const state = trainingReducer(
        initialTrainingState,
        updateLocalStorageData({
          data: {
            [STORAGE_TRAINING_SESSION_CODE_KEY]: '1234',
            [STORAGE_TRAINING_SESSION_PLAYER_CODE_KEY]: '4821',
          },
        }),
      );

      expect(state.participantInformations).toEqual({
        sessionCode: '1234',
        participantCode: '4821',
      });
    });

    it('les retient quand la séance accepte le joueur', () => {
      const state = trainingReducer(
        initialTrainingState,
        loadTrainingParticipantCurrentMatchSuccess({
          sessionCode: '1234',
          participantCode: '4821',
          currentMatch: {} as TrainingCurrentMatchDto,
        }),
      );

      expect(state.participantInformations).toEqual({
        sessionCode: '1234',
        participantCode: '4821',
      });
    });

    it('les oublie quand le serveur les a refusés', () => {
      const before = {
        ...initialTrainingState,
        participantInformations: { sessionCode: '1234', participantCode: '4821' },
      };

      const state = trainingReducer(before, forgetTrainingParticipantCodes());

      expect(state.participantInformations).toBeNull();
    });
  });
});
