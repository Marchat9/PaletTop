import { describe, expect, it } from 'vitest';
import { resetTraining } from './training.actions';
import { checkinTrainingParticipantSuccess } from './training.session.actions';
import { TrainingParticipantAdminDto, TrainingSessionAdminDto } from './training.models';
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

    // Le membre qui revient reprend sa ligne : aucun identifiant nouveau n'apparaît, c'est le
    // passage de « parti » à « présent » qui signale l'inscription.
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

  // Changer d'entraînement ne doit rien laisser du précédent : séances, rounds et classement
  // sont propres à celui qu'on quitte.
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
});
