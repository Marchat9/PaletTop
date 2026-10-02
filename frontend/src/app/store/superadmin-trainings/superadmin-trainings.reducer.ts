import { createReducer, on } from '@ngrx/store';
import { ApiCallStatus } from 'src/app/models/api-call.model';
import { Nullable } from 'src/app/models/nullable.model';
import {
  SuperAdminTrainingDetailDto,
  SuperAdminTrainingSummaryDto,
} from 'src/app/services/super-admin-training.service';
import {
  SuperAdminTrainingSearchCriteria,
  clearSuperAdminTrainingDetail,
  deleteSuperAdminTrainings,
  deleteSuperAdminTrainingsFailure,
  deleteSuperAdminTrainingsSuccess,
  loadSuperAdminTrainingDetail,
  loadSuperAdminTrainingDetailFailure,
  loadSuperAdminTrainingDetailSuccess,
  resetSuperAdminTrainingPassword,
  resetSuperAdminTrainingPasswordFailure,
  resetSuperAdminTrainingPasswordSuccess,
  searchSuperAdminTrainings,
  searchSuperAdminTrainingsFailure,
  searchSuperAdminTrainingsSuccess,
} from './superadmin-trainings.actions';

export interface SuperAdminTrainingsListState {
  items: SuperAdminTrainingSummaryDto[];
  total: number;
  criteria: SuperAdminTrainingSearchCriteria;
  isLoading: boolean;
  error: Nullable<string>;
}

export interface SuperAdminTrainingsState {
  list: SuperAdminTrainingsListState;
  detail: {
    data: Nullable<SuperAdminTrainingDetailDto>;
    isLoading: boolean;
    error: Nullable<string>;
  };
  deleteRequest: ApiCallStatus;
  passwordResetRequest: ApiCallStatus;
}

const initialCriteria: SuperAdminTrainingSearchCriteria = {
  page: 1,
  pageSize: 20,
  search: '',
  sortBy: 'createdAt',
  sortDir: 'DESC',
};

export const initialSuperAdminTrainingsState: SuperAdminTrainingsState = {
  list: { items: [], total: 0, criteria: initialCriteria, isLoading: false, error: null },
  detail: { data: null, isLoading: false, error: null },
  deleteRequest: { isLoading: false, error: null },
  passwordResetRequest: { isLoading: false, error: null },
};

export const superAdminTrainingsReducer = createReducer(
  initialSuperAdminTrainingsState,
  on(searchSuperAdminTrainings, (state, { criteria }) => ({
    ...state,
    list: { ...state.list, criteria, isLoading: true, error: null },
  })),
  on(searchSuperAdminTrainingsSuccess, (state, { items, total }) => ({
    ...state,
    list: { ...state.list, items, total, isLoading: false, error: null },
  })),
  on(searchSuperAdminTrainingsFailure, (state, { error }) => ({
    ...state,
    list: { ...state.list, isLoading: false, error },
  })),

  on(loadSuperAdminTrainingDetail, (state) => ({
    ...state,
    detail: { data: null, isLoading: true, error: null },
  })),
  on(loadSuperAdminTrainingDetailSuccess, (state, { training }) => ({
    ...state,
    detail: { data: training, isLoading: false, error: null },
  })),
  on(loadSuperAdminTrainingDetailFailure, (state, { error }) => ({
    ...state,
    detail: { data: null, isLoading: false, error },
  })),
  on(clearSuperAdminTrainingDetail, (state) => ({
    ...state,
    detail: initialSuperAdminTrainingsState.detail,
  })),

  on(deleteSuperAdminTrainings, (state) => ({
    ...state,
    deleteRequest: { isLoading: true, error: null },
  })),
  on(deleteSuperAdminTrainingsSuccess, (state) => ({
    ...state,
    deleteRequest: { isLoading: false, error: null },
  })),
  on(deleteSuperAdminTrainingsFailure, (state, { error }) => ({
    ...state,
    deleteRequest: { isLoading: false, error },
  })),

  on(resetSuperAdminTrainingPassword, (state) => ({
    ...state,
    passwordResetRequest: { isLoading: true, error: null },
  })),
  on(resetSuperAdminTrainingPasswordSuccess, (state) => ({
    ...state,
    passwordResetRequest: { isLoading: false, error: null },
  })),
  on(resetSuperAdminTrainingPasswordFailure, (state, { error }) => ({
    ...state,
    passwordResetRequest: { isLoading: false, error },
  })),
);
