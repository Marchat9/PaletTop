import { createReducer, on } from '@ngrx/store';
import { ApiCall } from 'src/app/models/api-call.model';
import { Nullable } from 'src/app/models/nullable.model';
import {
  clearSuperAdminSession,
  connectSuperAdmin,
  connectSuperAdminFailure,
  connectSuperAdminSuccess,
} from './superadmin.actions';

export interface SuperAdminState {
  authentication: ApiCall<Nullable<string>>;
}

export const initialSuperAdminState: SuperAdminState = {
  authentication: { data: null, isLoading: false, error: null },
};

export const superadminReducer = createReducer(
  initialSuperAdminState,
  on(connectSuperAdmin, (state) => ({
    ...state,
    authentication: { ...state.authentication, isLoading: true, error: null },
  })),
  on(connectSuperAdminSuccess, (state, { password }) => ({
    ...state,
    authentication: { data: password, isLoading: false, error: null },
  })),
  on(connectSuperAdminFailure, (state, { error }) => ({
    ...state,
    authentication: { data: null, isLoading: false, error },
  })),
  on(clearSuperAdminSession, () => initialSuperAdminState),
);
