import { createReducer, on } from '@ngrx/store';
import {
  createTraining,
  createTrainingFailure,
  createTrainingSuccess,
  disconnectTrainingAdministrator,
  loadTrainingParticipantCurrentMatch,
  loadTrainingParticipantCurrentMatchFailure,
  loadTrainingParticipantCurrentMatchSuccess,
  loadTrainingParticipantHistory,
  loadTrainingParticipantHistoryFailure,
  loadTrainingParticipantHistorySuccess,
  resetTraining,
} from './training.actions';
import {
  addTrainingMember,
  addTrainingMemberFailure,
  addTrainingMemberSuccess,
  connectTrainingAdministrator,
  connectTrainingAdministratorFailure,
  connectTrainingAdministratorSuccess,
  removeTrainingMember,
  removeTrainingMemberFailure,
  removeTrainingMemberSuccess,
  updateTrainingAdministratorInformations,
  updateTrainingAdministratorInformationsFailure,
  updateTrainingAdministratorInformationsSuccess,
} from './training.admin.actions';
import {
  checkinTrainingParticipant,
  checkinTrainingParticipantFailure,
  checkinTrainingParticipantSuccess,
  closeTrainingSession,
  closeTrainingSessionFailure,
  closeTrainingSessionSuccess,
  connectTrainingSessionAdministrator,
  connectTrainingSessionAdministratorFailure,
  connectTrainingSessionAdministratorSuccess,
  createTrainingSession,
  createTrainingSessionFailure,
  createTrainingSessionSuccess,
  dismissTrainingCheckinHandoff,
  loadTrainingLeaderboard,
  loadTrainingLeaderboardFailure,
  loadTrainingLeaderboardSuccess,
  loadTrainingSessionPublic,
  loadTrainingSessionPublicFailure,
  loadTrainingSessionPublicSuccess,
  loadTrainingSessions,
  loadTrainingSessionsFailure,
  loadTrainingSessionsSuccess,
  removeTrainingParticipant,
  removeTrainingParticipantFailure,
  removeTrainingParticipantSuccess,
} from './training.session.actions';
import {
  createTrainingTeam,
  createTrainingTeamFailure,
  createTrainingTeamSuccess,
  dissolveTrainingTeam,
  dissolveTrainingTeamFailure,
  dissolveTrainingTeamSuccess,
} from './training.team.actions';
import {
  generateTrainingRound,
  generateTrainingRoundFailure,
  generateTrainingRoundSuccess,
  loadTrainingRound,
  loadTrainingRoundFailure,
  loadTrainingRoundSuccess,
  loadTrainingRounds,
  loadTrainingRoundsFailure,
  loadTrainingRoundsSuccess,
} from './training.round.actions';
import {
  adminUpdateTrainingScore,
  adminUpdateTrainingScoreFailure,
  adminUpdateTrainingScoreSuccess,
  startTrainingMatch,
  startTrainingMatchFailure,
  startTrainingMatchSuccess,
  updateTrainingScore,
  updateTrainingScoreFailure,
  updateTrainingScoreSuccess,
  validateTrainingMatch,
  validateTrainingMatchFailure,
  validateTrainingMatchSuccess,
} from './training.match.actions';
import {
  TrainingCurrentMatchDto,
  TrainingMatchDto,
  TrainingParticipantAdminDto,
  TrainingRoundDto,
  TrainingSessionAdminDto,
  TrainingSessionPublicDto,
  TrainingTeamDto,
  TrainingState,
} from './training.models';
import { Nullable } from 'src/app/models/nullable.model';
import {
  wsTrainingLeaderboardUpdated,
  wsTrainingMatchUpdated,
  wsTrainingRoundGenerated,
  wsTrainingSessionUpdated,
} from '../realtime/realtime.actions';
import { updateLocalStorageData } from '../app-config/app-config.actions';
import {
  STORAGE_TRAINING_CODE_KEY,
  STORAGE_TRAINING_PASSWORD_KEY,
} from '../app-config/app-config.effects';

export const initialTrainingState: TrainingState = {
  training: { data: null, isLoading: false, error: null },
  adminInformations: null,
  requestStatus: {
    trainingCreation: { isLoading: false, error: null },
    updateTraining: { isLoading: false, error: null },
    addMember: { isLoading: false, error: null },
    removeMember: { isLoading: false, error: null },
    createSession: { isLoading: false, error: null },
    closeSession: { isLoading: false, error: null },
    checkinParticipant: { isLoading: false, error: null },
    removeParticipant: { isLoading: false, error: null },
    createTeam: { isLoading: false, error: null },
    dissolveTeam: { isLoading: false, error: null },
    generateRound: { isLoading: false, error: null },
    startMatch: { isLoading: false, error: null },
    updateScore: { isLoading: false, error: null },
    validateMatch: { isLoading: false, error: null },
    adminUpdateScore: { isLoading: false, error: null },
  },
  lastRequestedCode: null,
  sessions: { data: [], isLoading: false, error: null },
  currentSession: { data: null, isLoading: false, error: null },
  lastCheckedInParticipant: null,
  rounds: { data: [], isLoading: false, error: null },
  currentRound: { data: null, isLoading: false, error: null },
  leaderboard: { data: [], isLoading: false, error: null },
  participantCurrentMatch: { data: null, isLoading: false, error: null },
  participantHistory: { data: [], isLoading: false, error: null },
};

function replaceMatchInRound(round: TrainingRoundDto, match: TrainingMatchDto): TrainingRoundDto {
  return {
    ...round,
    matches: round.matches.map((m) => (m.id === match.id ? match : m)),
  };
}

// Un round regénéré ou reçu par websocket remplace celui de même identité plutôt que de
// s'ajouter : l'auteur de l'action reçoit la réponse HTTP *et* la diffusion websocket.
function upsertRound(rounds: TrainingRoundDto[], round: TrainingRoundDto): TrainingRoundDto[] {
  const isKnown = rounds.some((existing) => existing.id === round.id);
  return isKnown
    ? rounds.map((existing) => (existing.id === round.id ? round : existing))
    : [...rounds, round];
}

/**
 * Recalcule la vue « mon match » à partir d'un round diffusé : on cherche le camp qui contient
 * le participant. Absent du round, il vient d'être inscrit et entrera au suivant.
 */
function withParticipantMatchFromRound(
  current: Nullable<TrainingCurrentMatchDto>,
  round: TrainingRoundDto,
): Nullable<TrainingCurrentMatchDto> {
  if (!current) {
    return current;
  }

  const participantId = current.participant.id;
  const isMine = (team: Nullable<TrainingTeamDto>) =>
    (team?.members ?? []).some((member) => member.id === participantId);
  const match = round.matches.find((m) => isMine(m.teamA) || isMine(m.teamB)) ?? null;

  return {
    ...current,
    match,
    roundNumber: round.roundNumber,
    sitOut: match ? match.isBye : true,
  };
}

/**
 * Le back renvoie la session entière après un check-in, pas le participant inscrit : on le
 * retrouve en comparant avec la session qu'on avait en mémoire juste avant.
 *
 * Deux cas donnent le même résultat à l'écran : une nouvelle ligne (première venue), ou une
 * ligne repassée de « parti » à « présent » — un membre qui revient reprend son identité, donc
 * son code, plutôt que d'en recevoir un nouveau.
 */
function findAddedParticipant(
  previousSession: Nullable<TrainingSessionAdminDto | TrainingSessionPublicDto>,
  nextSession: TrainingSessionAdminDto,
): Nullable<TrainingParticipantAdminDto> {
  const previousStatuses = new Map(
    (previousSession?.participants ?? []).map((p) => [p.id, p.status]),
  );

  return (
    nextSession.participants.find(
      (participant) =>
        participant.status === 'PRESENT' && previousStatuses.get(participant.id) !== 'PRESENT',
    ) ?? null
  );
}

export const trainingReducer = createReducer(
  initialTrainingState,

  // Training creation
  on(createTraining, (state) => ({
    ...state,
    adminInformations: initialTrainingState.adminInformations,
    requestStatus: {
      ...state.requestStatus,
      trainingCreation: { isLoading: true, error: null },
    },
  })),
  on(createTrainingSuccess, (state, { training, password }) => ({
    ...state,
    training: { data: training, isLoading: false, error: null },
    adminInformations: { code: training.code, password },
    requestStatus: {
      ...state.requestStatus,
      trainingCreation: { isLoading: false, error: null },
    },
  })),
  on(createTrainingFailure, (state, { error }) => ({
    ...state,
    requestStatus: {
      ...state.requestStatus,
      trainingCreation: { isLoading: false, error },
    },
  })),

  // Join training session as participant
  on(loadTrainingParticipantCurrentMatch, (state) => ({
    ...state,
    participantCurrentMatch: { ...state.participantCurrentMatch, isLoading: true, error: null },
  })),
  on(loadTrainingParticipantCurrentMatchSuccess, (state, { currentMatch }) => ({
    ...state,
    participantCurrentMatch: { data: currentMatch, isLoading: false, error: null },
  })),
  on(loadTrainingParticipantCurrentMatchFailure, (state, { error }) => ({
    ...state,
    participantCurrentMatch: { ...state.participantCurrentMatch, isLoading: false, error },
  })),

  // Load participant history
  on(loadTrainingParticipantHistory, (state) => ({
    ...state,
    participantHistory: { ...state.participantHistory, isLoading: true, error: null },
  })),
  on(loadTrainingParticipantHistorySuccess, (state, { history }) => ({
    ...state,
    participantHistory: { data: history, isLoading: false, error: null },
  })),
  on(loadTrainingParticipantHistoryFailure, (state, { error }) => ({
    ...state,
    participantHistory: { ...state.participantHistory, isLoading: false, error },
  })),

  // Admin connection
  on(updateLocalStorageData, (state, { data }) => ({
    ...state,
    adminInformations:
      typeof data[STORAGE_TRAINING_CODE_KEY] === 'string' ||
      typeof data[STORAGE_TRAINING_PASSWORD_KEY] === 'string'
        ? {
            ...(state.adminInformations || {}),
            code: data[STORAGE_TRAINING_CODE_KEY] as string,
            password: data[STORAGE_TRAINING_PASSWORD_KEY] as string,
          }
        : state.adminInformations,
  })),
  on(connectTrainingAdministrator, (state, { code, password }) => ({
    ...state,
    training: { ...state.training, isLoading: true },
    adminInformations: { code, password },
  })),
  on(connectTrainingAdministratorSuccess, (state, { training }) => ({
    ...state,
    training: { data: training, isLoading: false, error: null },
  })),
  on(connectTrainingAdministratorFailure, (state, { error }) => ({
    ...state,
    training: { ...state.training, isLoading: false, error },
    adminInformations: null,
  })),

  // Update training informations
  on(updateTrainingAdministratorInformations, (state) => ({
    ...state,
    requestStatus: {
      ...state.requestStatus,
      updateTraining: { isLoading: true, error: null },
    },
  })),
  on(updateTrainingAdministratorInformationsSuccess, (state, { training }) => ({
    ...state,
    training: { ...state.training, data: training },
    requestStatus: {
      ...state.requestStatus,
      updateTraining: { isLoading: false, error: null },
    },
  })),
  on(updateTrainingAdministratorInformationsFailure, (state, { error }) => ({
    ...state,
    requestStatus: {
      ...state.requestStatus,
      updateTraining: { isLoading: false, error },
    },
  })),

  // Add member
  on(addTrainingMember, (state) => ({
    ...state,
    requestStatus: {
      ...state.requestStatus,
      addMember: { isLoading: true, error: null },
    },
  })),
  on(addTrainingMemberSuccess, (state, { training }) => ({
    ...state,
    training: { ...state.training, data: training },
    requestStatus: {
      ...state.requestStatus,
      addMember: { isLoading: false, error: null },
    },
  })),
  on(addTrainingMemberFailure, (state, { error }) => ({
    ...state,
    requestStatus: {
      ...state.requestStatus,
      addMember: { isLoading: false, error },
    },
  })),

  // Remove member
  on(removeTrainingMember, (state) => ({
    ...state,
    requestStatus: {
      ...state.requestStatus,
      removeMember: { isLoading: true, error: null },
    },
  })),
  on(removeTrainingMemberSuccess, (state, { training }) => ({
    ...state,
    training: { ...state.training, data: training },
    requestStatus: {
      ...state.requestStatus,
      removeMember: { isLoading: false, error: null },
    },
  })),
  on(removeTrainingMemberFailure, (state, { error }) => ({
    ...state,
    requestStatus: {
      ...state.requestStatus,
      removeMember: { isLoading: false, error },
    },
  })),

  // Create session
  on(createTrainingSession, (state) => ({
    ...state,
    requestStatus: {
      ...state.requestStatus,
      createSession: { isLoading: true, error: null },
    },
  })),
  on(createTrainingSessionSuccess, (state, { session }) => ({
    ...state,
    currentSession: { data: session, isLoading: false, error: null },
    sessions: {
      ...state.sessions,
      data: [
        ...state.sessions.data,
        {
          code: session.code,
          date: session.date,
          status: session.status,
          participantsCount: session.participants.length,
        },
      ],
    },
    requestStatus: {
      ...state.requestStatus,
      createSession: { isLoading: false, error: null },
    },
  })),
  on(createTrainingSessionFailure, (state, { error }) => ({
    ...state,
    requestStatus: {
      ...state.requestStatus,
      createSession: { isLoading: false, error },
    },
  })),

  // List sessions
  on(loadTrainingSessions, (state) => ({
    ...state,
    sessions: { ...state.sessions, isLoading: true, error: null },
  })),
  on(loadTrainingSessionsSuccess, (state, { sessions }) => ({
    ...state,
    sessions: { data: sessions, isLoading: false, error: null },
  })),
  on(loadTrainingSessionsFailure, (state, { error }) => ({
    ...state,
    sessions: { ...state.sessions, isLoading: false, error },
  })),

  // Load session (public)
  on(loadTrainingSessionPublic, (state) => ({
    ...state,
    currentSession: { ...state.currentSession, isLoading: true, error: null },
  })),
  on(loadTrainingSessionPublicSuccess, (state, { session }) => ({
    ...state,
    currentSession: { data: session, isLoading: false, error: null },
  })),
  on(loadTrainingSessionPublicFailure, (state, { error }) => ({
    ...state,
    currentSession: { ...state.currentSession, isLoading: false, error },
  })),

  // Connect to session as admin
  on(connectTrainingSessionAdministrator, (state) => ({
    ...state,
    currentSession: { ...state.currentSession, isLoading: true, error: null },
    // On change de séance : le code affiché ne concernerait plus celle qu'on regarde.
    lastCheckedInParticipant: null,
  })),
  on(connectTrainingSessionAdministratorSuccess, (state, { session }) => ({
    ...state,
    currentSession: { data: session, isLoading: false, error: null },
  })),
  on(connectTrainingSessionAdministratorFailure, (state, { error }) => ({
    ...state,
    currentSession: { ...state.currentSession, isLoading: false, error },
  })),

  // Close session
  on(closeTrainingSession, (state) => ({
    ...state,
    requestStatus: {
      ...state.requestStatus,
      closeSession: { isLoading: true, error: null },
    },
  })),
  on(closeTrainingSessionSuccess, (state, { session }) => ({
    ...state,
    currentSession: { ...state.currentSession, data: session },
    sessions: {
      ...state.sessions,
      data: state.sessions.data.map((s) =>
        s.code === session.code ? { ...s, status: session.status } : s,
      ),
    },
    requestStatus: {
      ...state.requestStatus,
      closeSession: { isLoading: false, error: null },
    },
  })),
  on(closeTrainingSessionFailure, (state, { error }) => ({
    ...state,
    requestStatus: {
      ...state.requestStatus,
      closeSession: { isLoading: false, error },
    },
  })),

  // Checkin participant
  on(checkinTrainingParticipant, (state) => ({
    ...state,
    requestStatus: {
      ...state.requestStatus,
      checkinParticipant: { isLoading: true, error: null },
    },
  })),
  on(checkinTrainingParticipantSuccess, (state, { session }) => ({
    ...state,
    currentSession: { ...state.currentSession, data: session },
    lastCheckedInParticipant: findAddedParticipant(state.currentSession.data, session),
    requestStatus: {
      ...state.requestStatus,
      checkinParticipant: { isLoading: false, error: null },
    },
  })),
  on(dismissTrainingCheckinHandoff, (state) => ({
    ...state,
    lastCheckedInParticipant: null,
  })),
  on(checkinTrainingParticipantFailure, (state, { error }) => ({
    ...state,
    requestStatus: {
      ...state.requestStatus,
      checkinParticipant: { isLoading: false, error },
    },
  })),

  // Remove participant
  on(removeTrainingParticipant, (state) => ({
    ...state,
    requestStatus: {
      ...state.requestStatus,
      removeParticipant: { isLoading: true, error: null },
    },
  })),
  on(removeTrainingParticipantSuccess, (state, { session }) => ({
    ...state,
    currentSession: { ...state.currentSession, data: session },
    requestStatus: {
      ...state.requestStatus,
      removeParticipant: { isLoading: false, error: null },
    },
  })),
  on(removeTrainingParticipantFailure, (state, { error }) => ({
    ...state,
    requestStatus: {
      ...state.requestStatus,
      removeParticipant: { isLoading: false, error },
    },
  })),

  // Leaderboard
  on(loadTrainingLeaderboard, (state) => ({
    ...state,
    leaderboard: { ...state.leaderboard, isLoading: true, error: null },
  })),
  on(loadTrainingLeaderboardSuccess, (state, { leaderboard }) => ({
    ...state,
    leaderboard: { data: leaderboard, isLoading: false, error: null },
  })),
  on(loadTrainingLeaderboardFailure, (state, { error }) => ({
    ...state,
    leaderboard: { ...state.leaderboard, isLoading: false, error },
  })),

  // Create team
  on(createTrainingTeam, (state) => ({
    ...state,
    requestStatus: {
      ...state.requestStatus,
      createTeam: { isLoading: true, error: null },
    },
  })),
  on(createTrainingTeamSuccess, (state, { session }) => ({
    ...state,
    currentSession: { ...state.currentSession, data: session },
    requestStatus: {
      ...state.requestStatus,
      createTeam: { isLoading: false, error: null },
    },
  })),
  on(createTrainingTeamFailure, (state, { error }) => ({
    ...state,
    requestStatus: {
      ...state.requestStatus,
      createTeam: { isLoading: false, error },
    },
  })),

  // Dissolve team
  on(dissolveTrainingTeam, (state) => ({
    ...state,
    requestStatus: {
      ...state.requestStatus,
      dissolveTeam: { isLoading: true, error: null },
    },
  })),
  on(dissolveTrainingTeamSuccess, (state, { session }) => ({
    ...state,
    currentSession: { ...state.currentSession, data: session },
    requestStatus: {
      ...state.requestStatus,
      dissolveTeam: { isLoading: false, error: null },
    },
  })),
  on(dissolveTrainingTeamFailure, (state, { error }) => ({
    ...state,
    requestStatus: {
      ...state.requestStatus,
      dissolveTeam: { isLoading: false, error },
    },
  })),

  // Generate round
  on(generateTrainingRound, (state) => ({
    ...state,
    requestStatus: {
      ...state.requestStatus,
      generateRound: { isLoading: true, error: null },
    },
  })),
  on(generateTrainingRoundSuccess, (state, { round }) => ({
    ...state,
    currentRound: { data: round, isLoading: false, error: null },
    rounds: { ...state.rounds, data: [...state.rounds.data, round] },
    requestStatus: {
      ...state.requestStatus,
      generateRound: { isLoading: false, error: null },
    },
  })),
  on(generateTrainingRoundFailure, (state, { error }) => ({
    ...state,
    requestStatus: {
      ...state.requestStatus,
      generateRound: { isLoading: false, error },
    },
  })),

  // List rounds
  on(loadTrainingRounds, (state) => ({
    ...state,
    rounds: { ...state.rounds, isLoading: true, error: null },
  })),
  on(loadTrainingRoundsSuccess, (state, { rounds }) => ({
    ...state,
    rounds: { data: rounds, isLoading: false, error: null },
  })),
  on(loadTrainingRoundsFailure, (state, { error }) => ({
    ...state,
    rounds: { ...state.rounds, isLoading: false, error },
  })),

  // Load single round
  on(loadTrainingRound, (state) => ({
    ...state,
    currentRound: { ...state.currentRound, isLoading: true, error: null },
  })),
  on(loadTrainingRoundSuccess, (state, { round }) => ({
    ...state,
    currentRound: { data: round, isLoading: false, error: null },
  })),
  on(loadTrainingRoundFailure, (state, { error }) => ({
    ...state,
    currentRound: { ...state.currentRound, isLoading: false, error },
  })),

  // Start match
  on(startTrainingMatch, (state) => ({
    ...state,
    requestStatus: {
      ...state.requestStatus,
      startMatch: { isLoading: true, error: null },
    },
  })),
  on(startTrainingMatchSuccess, (state, { match }) => ({
    ...state,
    rounds: { ...state.rounds, data: state.rounds.data.map((r) => replaceMatchInRound(r, match)) },
    currentRound: {
      ...state.currentRound,
      data: state.currentRound.data ? replaceMatchInRound(state.currentRound.data, match) : null,
    },
    requestStatus: {
      ...state.requestStatus,
      startMatch: { isLoading: false, error: null },
    },
  })),
  on(startTrainingMatchFailure, (state, { error }) => ({
    ...state,
    requestStatus: {
      ...state.requestStatus,
      startMatch: { isLoading: false, error },
    },
  })),

  // Update score
  on(updateTrainingScore, (state) => ({
    ...state,
    requestStatus: {
      ...state.requestStatus,
      updateScore: { isLoading: true, error: null },
    },
  })),
  on(updateTrainingScoreSuccess, (state, { match }) => ({
    ...state,
    rounds: { ...state.rounds, data: state.rounds.data.map((r) => replaceMatchInRound(r, match)) },
    currentRound: {
      ...state.currentRound,
      data: state.currentRound.data ? replaceMatchInRound(state.currentRound.data, match) : null,
    },
    requestStatus: {
      ...state.requestStatus,
      updateScore: { isLoading: false, error: null },
    },
  })),
  on(updateTrainingScoreFailure, (state, { error }) => ({
    ...state,
    requestStatus: {
      ...state.requestStatus,
      updateScore: { isLoading: false, error },
    },
  })),

  // Validate match
  on(validateTrainingMatch, (state) => ({
    ...state,
    requestStatus: {
      ...state.requestStatus,
      validateMatch: { isLoading: true, error: null },
    },
  })),
  on(validateTrainingMatchSuccess, (state, { match }) => ({
    ...state,
    rounds: { ...state.rounds, data: state.rounds.data.map((r) => replaceMatchInRound(r, match)) },
    currentRound: {
      ...state.currentRound,
      data: state.currentRound.data ? replaceMatchInRound(state.currentRound.data, match) : null,
    },
    requestStatus: {
      ...state.requestStatus,
      validateMatch: { isLoading: false, error: null },
    },
  })),
  on(validateTrainingMatchFailure, (state, { error }) => ({
    ...state,
    requestStatus: {
      ...state.requestStatus,
      validateMatch: { isLoading: false, error },
    },
  })),

  // Admin update score
  on(adminUpdateTrainingScore, (state) => ({
    ...state,
    requestStatus: {
      ...state.requestStatus,
      adminUpdateScore: { isLoading: true, error: null },
    },
  })),
  on(adminUpdateTrainingScoreSuccess, (state, { match }) => ({
    ...state,
    rounds: { ...state.rounds, data: state.rounds.data.map((r) => replaceMatchInRound(r, match)) },
    currentRound: {
      ...state.currentRound,
      data: state.currentRound.data ? replaceMatchInRound(state.currentRound.data, match) : null,
    },
    requestStatus: {
      ...state.requestStatus,
      adminUpdateScore: { isLoading: false, error: null },
    },
  })),
  on(adminUpdateTrainingScoreFailure, (state, { error }) => ({
    ...state,
    requestStatus: {
      ...state.requestStatus,
      adminUpdateScore: { isLoading: false, error },
    },
  })),

  // ---------------- Temps réel ----------------
  // La room admin diffuse la vue complète de la séance : elle remplace celle en mémoire,
  // sous réserve qu'il s'agisse bien de la séance affichée.
  on(wsTrainingSessionUpdated, (state, { session }) =>
    state.currentSession.data?.code === session.code
      ? { ...state, currentSession: { ...state.currentSession, data: session } }
      : state,
  ),
  on(wsTrainingRoundGenerated, (state, { round }) => ({
    ...state,
    rounds: { ...state.rounds, data: upsertRound(state.rounds.data, round) },
    currentRound: { data: round, isLoading: false, error: null },
    // Côté joueur, le round diffusé contient déjà son prochain match : on le retrouve par son
    // identité plutôt que de relancer un appel au serveur.
    participantCurrentMatch: {
      ...state.participantCurrentMatch,
      data: withParticipantMatchFromRound(state.participantCurrentMatch.data, round),
    },
  })),
  on(wsTrainingMatchUpdated, (state, { match }) => ({
    ...state,
    rounds: { ...state.rounds, data: state.rounds.data.map((r) => replaceMatchInRound(r, match)) },
    currentRound: {
      ...state.currentRound,
      data: state.currentRound.data ? replaceMatchInRound(state.currentRound.data, match) : null,
    },
    // Un score saisi par un coéquipier ou par l'administrateur met à jour ma propre carte.
    participantCurrentMatch: {
      ...state.participantCurrentMatch,
      data:
        state.participantCurrentMatch.data?.match?.id === match.id
          ? { ...state.participantCurrentMatch.data, match }
          : state.participantCurrentMatch.data,
    },
  })),
  on(wsTrainingLeaderboardUpdated, (state, { leaderboard }) => ({
    ...state,
    leaderboard: { data: leaderboard, isLoading: false, error: null },
  })),

  // Remise à zéro complète : on change d'entraînement (déconnexion admin, création, arrivée d'un
  // joueur). Tout ce qui reste en mémoire appartient au précédent et n'a plus rien à y faire.
  on(resetTraining, (state) => ({
    ...state,
    training: initialTrainingState.training,
    participantCurrentMatch: initialTrainingState.participantCurrentMatch,
    participantHistory: initialTrainingState.participantHistory,
    sessions: initialTrainingState.sessions,
    currentSession: initialTrainingState.currentSession,
    rounds: initialTrainingState.rounds,
    currentRound: initialTrainingState.currentRound,
    leaderboard: initialTrainingState.leaderboard,
    lastCheckedInParticipant: null,
  })),
  on(disconnectTrainingAdministrator, (state) => ({
    ...state,
    adminInformations: null,
  })),
);
