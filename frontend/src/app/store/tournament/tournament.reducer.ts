import { createReducer, on } from '@ngrx/store';
import {
  createTournament,
  createTournamentFailure,
  createTournamentSuccess,
  disconnectTournamentAdministrator,
  loadTournamentInformation,
  loadTournamentInformationFailure,
  loadTournamentInformationSuccess,
  resetTournament,
} from './tournament.actions';
import {
  connectTournamentAdministrator,
  connectTournamentAdministratorFailure,
  connectTournamentAdministratorSuccess,
  updateTournamentAdministratorConfiguration,
  updateTournamentAdministratorConfigurationFailure,
  updateTournamentAdministratorConfigurationSuccess,
  removeTournamentAdministratorTeam,
  removeTournamentAdministratorTeamFailure,
  removeTournamentAdministratorTeamSuccess,
  updateTournamentAdministratorSingleTeam,
  updateTournamentAdministratorSingleTeamFailure,
  updateTournamentAdministratorSingleTeamSuccess,
  updateTournamentAdministratorTeam,
  updateTournamentAdministratorTeamFailure,
  updateTournamentAdministratorTeamSuccess,
} from './tournament.admin.actions';
import {
  completeTournament,
  completeTournamentFailure,
  completeTournamentSuccess,
  nextSession,
  nextSessionFailure,
  nextSessionSuccess,
  startTournament,
  startTournamentFailure,
  startTournamentSuccess,
} from './tournament.match.actions';
import { TournamentState } from './tournament.models';
import { wsTournamentUpdated } from 'src/app/store/realtime/realtime.actions';
import { updateLocalStorageData } from '../app-config/app-config.actions';
import {
  STORAGE_TOURNAMENT_CODE_KEY,
  STORAGE_TOURNAMENT_PASSWORD_KEY,
} from '../app-config/app-config.effects';

export const initialTournamentState: TournamentState = {
  tournament: { data: null, isLoading: false, error: null },
  adminInformations: null,
  adminRequest: {
    tournamentCreation: { isLoading: false, error: null },
    updateConfiguration: { isLoading: false, error: null },
    updateTeams: { isLoading: false, error: null },
    updateTeam: { isLoading: false, error: null },
    deleteTeam: { isLoading: false, error: null },
    startTournament: { isLoading: false, error: null },
    nextSession: { isLoading: false, error: null },
    completeTournament: { isLoading: false, error: null },
  },
  lastRequestedCode: null,
};

export const tournamentReducer = createReducer(
  initialTournamentState,

  on(wsTournamentUpdated, (state, { tournament }) => ({
    ...state,
    tournament: { ...state.tournament, data: tournament },
  })),

  // Tournament creation
  on(createTournament, (state) => ({
    ...state,
    adminInformations: initialTournamentState.adminInformations,
    adminRequest: {
      ...state.adminRequest,
      tournamentCreation: {
        ...state.adminRequest.tournamentCreation,
        error: null,
        isLoading: true,
      },
    },
  })),
  on(createTournamentSuccess, (state, { tournament, password }) => ({
    ...state,
    tournament: {
      data: tournament,
      isLoading: false,
      error: null,
    },
    adminInformations: {
      code: tournament.code,
      password,
    },
    adminRequest: {
      ...state.adminRequest,
      tournamentCreation: {
        ...state.adminRequest.tournamentCreation,
        isLoading: false,
      },
    },
  })),
  on(createTournamentFailure, (state, { error }) => ({
    ...state,
    adminRequest: {
      ...state.adminRequest,
      tournamentCreation: {
        ...state.adminRequest.tournamentCreation,
        isLoading: false,
        error,
      },
    },
  })),

  // Admin connection
  on(updateLocalStorageData, (state, { data }) => ({
    ...state,
    adminInformations:
      typeof data[STORAGE_TOURNAMENT_CODE_KEY] === 'string' ||
      typeof data[STORAGE_TOURNAMENT_PASSWORD_KEY] === 'string'
        ? {
            ...(state.adminInformations || {}),
            code: data[STORAGE_TOURNAMENT_CODE_KEY] as string,
            password: data[STORAGE_TOURNAMENT_PASSWORD_KEY] as string,
          }
        : state.adminInformations,
  })),
  on(connectTournamentAdministrator, (state, { code, password }) => ({
    ...state,
    tournament: {
      ...initialTournamentState.tournament,
      isLoading: true,
    },
    adminInformations: {
      code,
      password,
    },
  })),
  on(connectTournamentAdministratorSuccess, (state, { tournament }) => ({
    ...state,
    tournament: {
      data: tournament,
      isLoading: false,
      error: null,
    },
  })),
  on(connectTournamentAdministratorFailure, (state, { error }) => ({
    ...state,
    tournament: {
      ...state.tournament,
      isLoading: false,
      error,
    },
    adminInformations: null,
  })),

  // Load tournament information as player
  on(loadTournamentInformation, (state) => ({
    ...state,
    tournament: {
      ...initialTournamentState.tournament,
      isLoading: true,
    },
  })),
  on(loadTournamentInformationSuccess, (state, { tournament }) => ({
    ...state,
    tournament: {
      data: tournament,
      isLoading: false,
      error: null,
    },
  })),
  on(loadTournamentInformationFailure, (state, { error }) => ({
    ...state,
    tournament: {
      ...state.tournament,
      isLoading: false,
      error,
    },
  })),

  // Update tournament configuration as admin
  on(updateTournamentAdministratorConfiguration, (state) => ({
    ...state,
    adminRequest: {
      ...state.adminRequest,
      updateConfiguration: {
        ...initialTournamentState.adminRequest.updateConfiguration,
        isLoading: true,
      },
    },
  })),
  on(updateTournamentAdministratorConfigurationSuccess, (state, { tournament }) => ({
    ...state,
    tournament: {
      ...state.tournament,
      data: tournament,
    },
    adminRequest: {
      ...state.adminRequest,
      updateConfiguration: {
        ...state.adminRequest.updateConfiguration,
        isLoading: false,
      },
    },
  })),
  on(updateTournamentAdministratorConfigurationFailure, (state, { error }) => ({
    ...state,
    adminRequest: {
      ...state.adminRequest,
      updateConfiguration: {
        ...state.adminRequest.updateConfiguration,
        isLoading: false,
        error,
      },
    },
  })),

  // Update tournament teams as admin
  on(updateTournamentAdministratorTeam, (state) => ({
    ...state,
    adminRequest: {
      ...state.adminRequest,
      updateTeams: {
        ...initialTournamentState.adminRequest.updateTeams,
        isLoading: true,
      },
    },
  })),
  on(updateTournamentAdministratorTeamSuccess, (state, { tournament }) => ({
    ...state,
    tournament: {
      ...state.tournament,
      data: tournament,
    },
    adminRequest: {
      ...state.adminRequest,
      updateTeams: {
        ...state.adminRequest.updateTeams,
        isLoading: false,
      },
    },
  })),
  on(updateTournamentAdministratorTeamFailure, (state, { error }) => ({
    ...state,
    adminRequest: {
      ...state.adminRequest,
      updateTeams: {
        ...state.adminRequest.updateTeams,
        isLoading: false,
        error,
      },
    },
  })),

  // Update a single team as admin
  on(updateTournamentAdministratorSingleTeam, (state) => ({
    ...state,
    adminRequest: {
      ...state.adminRequest,
      updateTeam: {
        ...initialTournamentState.adminRequest.updateTeam,
        isLoading: true,
      },
    },
  })),
  on(updateTournamentAdministratorSingleTeamSuccess, (state, { team }) => ({
    ...state,
    tournament: {
      ...state.tournament,
      data: state.tournament.data
        ? {
            ...state.tournament.data,
            teams: state.tournament.data.teams.map((t) =>
              t.id === team.id
                ? { ...t, name: team.name, code: team.code, players: team.players }
                : t,
            ),
          }
        : state.tournament.data,
    },
    adminRequest: {
      ...state.adminRequest,
      updateTeam: {
        ...state.adminRequest.updateTeam,
        isLoading: false,
      },
    },
  })),
  on(updateTournamentAdministratorSingleTeamFailure, (state, { error }) => ({
    ...state,
    adminRequest: {
      ...state.adminRequest,
      updateTeam: {
        ...state.adminRequest.updateTeam,
        isLoading: false,
        error,
      },
    },
  })),

  // Remove a team as admin
  on(removeTournamentAdministratorTeam, (state) => ({
    ...state,
    adminRequest: {
      ...state.adminRequest,
      deleteTeam: {
        ...initialTournamentState.adminRequest.deleteTeam,
        isLoading: true,
      },
    },
  })),
  on(removeTournamentAdministratorTeamSuccess, (state, { teamId }) => ({
    ...state,
    tournament: {
      ...state.tournament,
      data: state.tournament.data
        ? {
            ...state.tournament.data,
            teams: state.tournament.data.teams.filter((t) => t.id !== teamId),
          }
        : state.tournament.data,
    },
    adminRequest: {
      ...state.adminRequest,
      deleteTeam: {
        ...state.adminRequest.deleteTeam,
        isLoading: false,
      },
    },
  })),
  on(removeTournamentAdministratorTeamFailure, (state, { error }) => ({
    ...state,
    adminRequest: {
      ...state.adminRequest,
      deleteTeam: {
        ...state.adminRequest.deleteTeam,
        isLoading: false,
        error,
      },
    },
  })),

  // Start tournament
  on(startTournament, (state) => ({
    ...state,
    adminRequest: {
      ...state.adminRequest,
      startTournament: { isLoading: true, error: null },
    },
  })),
  on(startTournamentSuccess, (state, { tournament }) => ({
    ...state,
    tournament: { ...state.tournament, data: tournament },
    adminRequest: {
      ...state.adminRequest,
      startTournament: { isLoading: false, error: null },
    },
  })),
  on(startTournamentFailure, (state, { error }) => ({
    ...state,
    adminRequest: {
      ...state.adminRequest,
      startTournament: { isLoading: false, error },
    },
  })),

  // Next session
  on(nextSession, (state) => ({
    ...state,
    adminRequest: {
      ...state.adminRequest,
      nextSession: { isLoading: true, error: null },
    },
  })),
  on(nextSessionSuccess, (state, { tournament }) => ({
    ...state,
    tournament: { ...state.tournament, data: tournament },
    adminRequest: {
      ...state.adminRequest,
      nextSession: { isLoading: false, error: null },
    },
  })),
  on(nextSessionFailure, (state, { error }) => ({
    ...state,
    adminRequest: {
      ...state.adminRequest,
      nextSession: { isLoading: false, error },
    },
  })),

  // Complete tournament
  on(completeTournament, (state) => ({
    ...state,
    adminRequest: {
      ...state.adminRequest,
      completeTournament: { isLoading: true, error: null },
    },
  })),
  on(completeTournamentSuccess, (state, { tournament }) => ({
    ...state,
    tournament: { ...state.tournament, data: tournament },
    adminRequest: {
      ...state.adminRequest,
      completeTournament: { isLoading: false, error: null },
    },
  })),
  on(completeTournamentFailure, (state, { error }) => ({
    ...state,
    adminRequest: {
      ...state.adminRequest,
      completeTournament: { isLoading: false, error },
    },
  })),

  on(resetTournament, (state) => ({
    ...state,
    tournament: initialTournamentState.tournament,
  })),
  on(disconnectTournamentAdministrator, (state) => ({
    ...state,
    adminInformations: null,
  })),
);
