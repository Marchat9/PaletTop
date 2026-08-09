import { createAction, props } from '@ngrx/store';

export const connectSuperAdmin = createAction(
  '[SuperAdmin] Connect',
  props<{ password: string }>(),
);
export const connectSuperAdminSuccess = createAction(
  '[SuperAdmin] Connect Success',
  props<{ password: string }>(),
);
export const connectSuperAdminFailure = createAction(
  '[SuperAdmin] Connect Failure',
  props<{ error: string }>(),
);
export const clearSuperAdminSession = createAction('[SuperAdmin] Clear Session');
