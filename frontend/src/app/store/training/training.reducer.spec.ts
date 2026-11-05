import { describe, expect, it } from 'vitest';
import { updateLocalStorageData } from '../app-config/app-config.actions';
import {
  STORAGE_TRAINING_SESSION_CODE_KEY,
  STORAGE_TRAINING_SESSION_PLAYER_CODE_KEY,
} from '../app-config/app-config.effects';
import {
  forgetTrainingParticipantCodes,
  loadTrainingParticipantCurrentMatchSuccess,
  loadTrainingParticipantHistorySuccess,
  resetTraining,
} from './training.actions';
import {
  wsTrainingMatchUpdated,
  wsTrainingRoundGenerated,
  wsTrainingSessionUpdated,
} from '../realtime/realtime.actions';
import {
  checkinTrainingParticipant,
  checkinTrainingParticipantSuccess,
} from './training.session.actions';
import {
  renameTrainingMemberSuccess,
  setTrainingAdminMemberSuccess,
} from './training.admin.actions';
import {
  AdminTrainingDto,
  TrainingCurrentMatchDto,
  TrainingMatchDto,
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

    // The websocket broadcast of the newcomer usually lands before the HTTP answer: the newcomer is
    // found against the participants of the moment the check-in was sent.
    it('désigne le participant même quand le websocket arrive avant la réponse', () => {
      const before = {
        ...initialTrainingState,
        currentSession: { data: buildSession([]), isLoading: false, error: null },
      };

      const sent = trainingReducer(
        before,
        checkinTrainingParticipant({ sessionCode: 'S', name: 'Jean' }),
      );
      const broadcast = trainingReducer(
        sent,
        wsTrainingSessionUpdated({ session: buildSession([JEAN]) }),
      );
      const state = trainingReducer(
        broadcast,
        checkinTrainingParticipantSuccess({ session: buildSession([JEAN]) }),
      );

      expect(state.lastCheckedInParticipant).toEqual(JEAN);
      expect(state.checkinBaseline).toBeNull();
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

  describe('renommage et admin joueur enregistrés ensemble', () => {
    const before: AdminTrainingDto = {
      id: 't1',
      code: 'CLUB-1',
      name: 'Club du jeudi',
      createdAt: '2026-01-01T18:00:00.000Z',
      members: [{ id: 'm1', name: 'Mathieu' }],
      adminMemberId: null,
    };
    // Each response was built by the server before the other request was saved.
    const renamed = renameTrainingMemberSuccess({
      training: { ...before, members: [{ id: 'm1', name: 'Mathieu A.' }] },
    });
    const adminSet = setTrainingAdminMemberSuccess({
      training: { ...before, adminMemberId: 'm1' },
    });
    const loaded = {
      ...initialTrainingState,
      training: { ...initialTrainingState.training, data: before },
    };

    it('garde les deux quand le renommage répond en dernier', () => {
      const state = [adminSet, renamed].reduce(trainingReducer, loaded);

      expect(state.training.data?.adminMemberId).toBe('m1');
      expect(state.training.data?.members[0].name).toBe('Mathieu A.');
    });

    it('garde les deux quand l’admin joueur répond en dernier', () => {
      const state = [renamed, adminSet].reduce(trainingReducer, loaded);

      expect(state.training.data?.adminMemberId).toBe('m1');
      expect(state.training.data?.members[0].name).toBe('Mathieu A.');
    });
  });

  describe('historique du joueur en temps réel', () => {
    function buildMatch(id: string, overrides: Partial<TrainingMatchDto> = {}): TrainingMatchDto {
      return {
        id,
        status: 'PENDING',
        teamA: {
          id: `${id}-a`,
          kind: 'EPHEMERAL',
          members: [
            { id: 'pA', name: 'A' },
            { id: 'pB', name: 'B' },
          ],
        },
        teamB: {
          id: `${id}-b`,
          kind: 'EPHEMERAL',
          members: [
            { id: 'pD', name: 'D' },
            { id: 'pE', name: 'E' },
          ],
        },
        isBye: false,
        scoreA: 0,
        scoreB: 0,
        ...overrides,
      };
    }

    // Player B opened the page during round 1, while their match was still pending.
    function playerBState(match: TrainingMatchDto) {
      const loaded = trainingReducer(
        initialTrainingState,
        loadTrainingParticipantCurrentMatchSuccess({
          sessionCode: '123456',
          participantCode: '1111',
          currentMatch: {
            participant: { id: 'pB', name: 'B' },
            match,
            roundNumber: 1,
            sitOut: false,
          },
        }),
      );
      return trainingReducer(loaded, loadTrainingParticipantHistorySuccess({ history: [match] }));
    }

    it('updates the history when a team-mate validates the match', () => {
      const validated = buildMatch('m1', { status: 'VALIDATED', scoreA: 11, scoreB: 4 });

      const state = trainingReducer(
        playerBState(buildMatch('m1')),
        wsTrainingMatchUpdated({ match: validated }),
      );

      expect(state.participantHistory.data).toEqual([validated]);
    });

    it('adds the match of a newly generated round to the history', () => {
      const first = buildMatch('m1', { status: 'VALIDATED' });
      const second = buildMatch('m2');

      const state = trainingReducer(
        playerBState(first),
        wsTrainingRoundGenerated({
          round: { id: 'r2', roundNumber: 2, status: 'OPEN', matches: [second] },
        }),
      );

      expect(state.participantHistory.data.map((match) => match.id)).toEqual(['m1', 'm2']);
    });

    it('does not duplicate a match already in the history', () => {
      const match = buildMatch('m1');

      const state = trainingReducer(
        playerBState(match),
        wsTrainingRoundGenerated({
          round: { id: 'r1', roundNumber: 1, status: 'OPEN', matches: [match] },
        }),
      );

      expect(state.participantHistory.data).toHaveLength(1);
    });

    it('ignores the matches the player is not part of', () => {
      const initial = buildMatch('m1');
      const other = buildMatch('m3', {
        teamA: { id: 'x', kind: 'EPHEMERAL', members: [{ id: 'pC', name: 'C' }] },
        teamB: { id: 'y', kind: 'EPHEMERAL', members: [{ id: 'pF', name: 'F' }] },
      });

      const state = trainingReducer(
        playerBState(initial),
        wsTrainingMatchUpdated({ match: other }),
      );

      expect(state.participantHistory.data).toEqual([initial]);
    });
  });
});
