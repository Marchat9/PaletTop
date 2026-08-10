import { createReducer, on } from '@ngrx/store';
import { ApiCallStatus } from 'src/app/models/api-call.model';
import { Nullable } from 'src/app/models/nullable.model';
import { SuperAdminTournamentSummaryDto } from 'src/app/services/super-admin-tournament.service';
import { TournamentDto } from 'src/app/store/tournament/tournament.models';
import {
  SuperAdminTournamentSearchCriteria,
  changeSuperAdminTournamentsStatus,
  changeSuperAdminTournamentsStatusFailure,
  changeSuperAdminTournamentsStatusSuccess,
  clearSuperAdminTournamentDetail,
  deleteSuperAdminTournaments,
  deleteSuperAdminTournamentsFailure,
  deleteSuperAdminTournamentsSuccess,
  loadSuperAdminTournamentDetail,
  loadSuperAdminTournamentDetailFailure,
  loadSuperAdminTournamentDetailSuccess,
  resetSuperAdminTournamentPassword,
  resetSuperAdminTournamentPasswordFailure,
  resetSuperAdminTournamentPasswordSuccess,
  searchSuperAdminTournaments,
  searchSuperAdminTournamentsFailure,
  searchSuperAdminTournamentsSuccess,
} from './superadmin-tournaments.actions';

export interface SuperAdminTournamentsListState {
  items: SuperAdminTournamentSummaryDto[];
  total: number;
  criteria: SuperAdminTournamentSearchCriteria;
  isLoading: boolean;
  error: Nullable<string>;
}

export interface SuperAdminTournamentsState {
  list: SuperAdminTournamentsListState;
  detail: {
    data: Nullable<TournamentDto>;
    isLoading: boolean;
    error: Nullable<string>;
  };
  deleteRequest: ApiCallStatus;
  statusChangeRequest: ApiCallStatus;
  passwordResetRequest: ApiCallStatus;
}

const initialCriteria: SuperAdminTournamentSearchCriteria = {
  page: 1,
  pageSize: 20,
  search: '',
  status: null,
  sortBy: 'createdAt',
  sortDir: 'DESC',
};

export const initialSuperAdminTournamentsState: SuperAdminTournamentsState = {
  list: { items: [], total: 0, criteria: initialCriteria, isLoading: false, error: null },
  detail: { data: null, isLoading: false, error: null },
  deleteRequest: { isLoading: false, error: null },
  statusChangeRequest: { isLoading: false, error: null },
  passwordResetRequest: { isLoading: false, error: null },
};

export const superAdminTournamentsReducer = createReducer(
  initialSuperAdminTournamentsState,
  on(searchSuperAdminTournaments, (state, { criteria }) => ({
    ...state,
    list: { ...state.list, criteria, isLoading: true, error: null },
  })),
  on(searchSuperAdminTournamentsSuccess, (state, { items, total }) => ({
    ...state,
    list: { ...state.list, items, total, isLoading: false, error: null },
  })),
  on(searchSuperAdminTournamentsFailure, (state, { error }) => ({
    ...state,
    list: { ...state.list, isLoading: false, error },
  })),

  on(loadSuperAdminTournamentDetail, (state) => ({
    ...state,
    detail: { data: null, isLoading: true, error: null },
  })),
  on(loadSuperAdminTournamentDetailSuccess, (state, { tournament }) => ({
    ...state,
    detail: { data: tournament, isLoading: false, error: null },
  })),
  on(loadSuperAdminTournamentDetailFailure, (state, { error }) => ({
    ...state,
    detail: { data: null, isLoading: false, error },
  })),
  on(clearSuperAdminTournamentDetail, (state) => ({
    ...state,
    detail: initialSuperAdminTournamentsState.detail,
  })),

  on(deleteSuperAdminTournaments, (state) => ({
    ...state,
    deleteRequest: { isLoading: true, error: null },
  })),
  on(deleteSuperAdminTournamentsSuccess, (state) => ({
    ...state,
    deleteRequest: { isLoading: false, error: null },
  })),
  on(deleteSuperAdminTournamentsFailure, (state, { error }) => ({
    ...state,
    deleteRequest: { isLoading: false, error },
  })),

  on(changeSuperAdminTournamentsStatus, (state) => ({
    ...state,
    statusChangeRequest: { isLoading: true, error: null },
  })),
  on(changeSuperAdminTournamentsStatusSuccess, (state) => ({
    ...state,
    statusChangeRequest: { isLoading: false, error: null },
  })),
  on(changeSuperAdminTournamentsStatusFailure, (state, { error }) => ({
    ...state,
    statusChangeRequest: { isLoading: false, error },
  })),

  on(resetSuperAdminTournamentPassword, (state) => ({
    ...state,
    passwordResetRequest: { isLoading: true, error: null },
  })),
  on(resetSuperAdminTournamentPasswordSuccess, (state) => ({
    ...state,
    passwordResetRequest: { isLoading: false, error: null },
  })),
  on(resetSuperAdminTournamentPasswordFailure, (state, { error }) => ({
    ...state,
    passwordResetRequest: { isLoading: false, error },
  })),
);
