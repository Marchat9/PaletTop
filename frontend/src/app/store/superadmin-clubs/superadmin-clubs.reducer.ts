import { createReducer, on } from '@ngrx/store';
import { ApiCallStatus } from 'src/app/models/api-call.model';
import { Nullable } from 'src/app/models/nullable.model';
import { SuperAdminClubSummaryDto } from 'src/app/services/super-admin-club.service';
import {
  SuperAdminClubSearchCriteria,
  deleteSuperAdminClubs,
  deleteSuperAdminClubsFailure,
  deleteSuperAdminClubsSuccess,
  renameSuperAdminClub,
  renameSuperAdminClubFailure,
  renameSuperAdminClubSuccess,
  searchSuperAdminClubs,
  searchSuperAdminClubsFailure,
  searchSuperAdminClubsSuccess,
} from './superadmin-clubs.actions';

export interface SuperAdminClubsListState {
  items: SuperAdminClubSummaryDto[];
  total: number;
  criteria: SuperAdminClubSearchCriteria;
  isLoading: boolean;
  error: Nullable<string>;
}

export interface SuperAdminClubsState {
  list: SuperAdminClubsListState;
  renameRequest: ApiCallStatus;
  deleteRequest: ApiCallStatus;
}

const initialCriteria: SuperAdminClubSearchCriteria = {
  page: 1,
  pageSize: 20,
  search: '',
  sortBy: 'name',
  sortDir: 'DESC',
};

export const initialSuperAdminClubsState: SuperAdminClubsState = {
  list: { items: [], total: 0, criteria: initialCriteria, isLoading: false, error: null },
  renameRequest: { isLoading: false, error: null },
  deleteRequest: { isLoading: false, error: null },
};

export const superAdminClubsReducer = createReducer(
  initialSuperAdminClubsState,
  on(searchSuperAdminClubs, (state, { criteria }) => ({
    ...state,
    list: { ...state.list, criteria, isLoading: true, error: null },
  })),
  on(searchSuperAdminClubsSuccess, (state, { items, total }) => ({
    ...state,
    list: { ...state.list, items, total, isLoading: false, error: null },
  })),
  on(searchSuperAdminClubsFailure, (state, { error }) => ({
    ...state,
    list: { ...state.list, isLoading: false, error },
  })),

  on(renameSuperAdminClub, (state) => ({
    ...state,
    renameRequest: { isLoading: true, error: null },
  })),
  on(renameSuperAdminClubSuccess, (state) => ({
    ...state,
    renameRequest: { isLoading: false, error: null },
  })),
  on(renameSuperAdminClubFailure, (state, { error }) => ({
    ...state,
    renameRequest: { isLoading: false, error },
  })),

  on(deleteSuperAdminClubs, (state) => ({
    ...state,
    deleteRequest: { isLoading: true, error: null },
  })),
  on(deleteSuperAdminClubsSuccess, (state) => ({
    ...state,
    deleteRequest: { isLoading: false, error: null },
  })),
  on(deleteSuperAdminClubsFailure, (state, { error }) => ({
    ...state,
    deleteRequest: { isLoading: false, error },
  })),
);
