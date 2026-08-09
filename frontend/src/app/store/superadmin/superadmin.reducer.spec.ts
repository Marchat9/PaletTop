import {
  clearSuperAdminSession,
  connectSuperAdmin,
  connectSuperAdminFailure,
  connectSuperAdminSuccess,
} from './superadmin.actions';
import { initialSuperAdminState, superadminReducer } from './superadmin.reducer';

describe('superadminReducer', () => {
  it('returns the initial state for an unknown action', () => {
    const state = superadminReducer(undefined, { type: '@@INIT' });
    expect(state).toEqual(initialSuperAdminState);
  });

  it('sets isLoading and clears error on connectSuperAdmin, without touching data', () => {
    const seeded = {
      authentication: { data: null, isLoading: false, error: 'previous error' },
    };

    const state = superadminReducer(seeded, connectSuperAdmin({ password: 'secret' }));

    expect(state.authentication).toEqual({ data: null, isLoading: true, error: null });
  });

  it('stores the password on connectSuperAdminSuccess', () => {
    const state = superadminReducer(
      initialSuperAdminState,
      connectSuperAdminSuccess({ password: 'secret' }),
    );

    expect(state.authentication).toEqual({ data: 'secret', isLoading: false, error: null });
  });

  it('clears data and sets error on connectSuperAdminFailure', () => {
    const seeded = {
      authentication: { data: 'stale', isLoading: true, error: null },
    };

    const state = superadminReducer(
      seeded,
      connectSuperAdminFailure({ error: 'Mot de passe invalide' }),
    );

    expect(state.authentication).toEqual({
      data: null,
      isLoading: false,
      error: 'Mot de passe invalide',
    });
  });

  it('resets to the initial state on clearSuperAdminSession', () => {
    const seeded = {
      authentication: { data: 'secret', isLoading: false, error: null },
    };

    const state = superadminReducer(seeded, clearSuperAdminSession());

    expect(state).toEqual(initialSuperAdminState);
  });
});
