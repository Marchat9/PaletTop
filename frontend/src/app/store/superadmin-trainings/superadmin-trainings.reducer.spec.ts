import {
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
import {
  initialSuperAdminTrainingsState,
  superAdminTrainingsReducer,
} from './superadmin-trainings.reducer';

const CRITERIA = {
  page: 1,
  pageSize: 20,
  search: '',
  sortBy: 'createdAt' as const,
  sortDir: 'DESC' as const,
};

describe('superAdminTrainingsReducer', () => {
  it('returns the initial state for an unknown action', () => {
    expect(superAdminTrainingsReducer(undefined, { type: '@@INIT' })).toEqual(
      initialSuperAdminTrainingsState,
    );
  });

  it('sets isLoading and stores the criteria on search', () => {
    const state = superAdminTrainingsReducer(
      initialSuperAdminTrainingsState,
      searchSuperAdminTrainings({ criteria: CRITERIA }),
    );
    expect(state.list.isLoading).toBe(true);
    expect(state.list.criteria).toEqual(CRITERIA);
  });

  it('stores items and total on search success', () => {
    const items = [
      {
        id: '1',
        code: 'A',
        name: 'A',
        sessionsCount: 2,
        openSessionsCount: 1,
        createdAt: '2026-01-01',
      },
    ];
    const state = superAdminTrainingsReducer(
      initialSuperAdminTrainingsState,
      searchSuperAdminTrainingsSuccess({ items, total: 1 }),
    );
    expect(state.list.items).toEqual(items);
    expect(state.list.total).toBe(1);
    expect(state.list.isLoading).toBe(false);
  });

  it('stores the error on search failure', () => {
    const state = superAdminTrainingsReducer(
      initialSuperAdminTrainingsState,
      searchSuperAdminTrainingsFailure({ error: 'boom' }),
    );
    expect(state.list.isLoading).toBe(false);
    expect(state.list.error).toBe('boom');
  });

  it('clears previous detail data when a detail load starts', () => {
    const seeded = {
      ...initialSuperAdminTrainingsState,
      detail: { data: { id: 'old' } as any, isLoading: false, error: null },
    };
    const state = superAdminTrainingsReducer(seeded, loadSuperAdminTrainingDetail({ id: '2' }));
    expect(state.detail).toEqual({ data: null, isLoading: true, error: null });
  });

  it('stores the training on detail success', () => {
    const training = { id: '2' } as any;
    const state = superAdminTrainingsReducer(
      initialSuperAdminTrainingsState,
      loadSuperAdminTrainingDetailSuccess({ training }),
    );
    expect(state.detail).toEqual({ data: training, isLoading: false, error: null });
  });

  it('stores the error on detail failure', () => {
    const state = superAdminTrainingsReducer(
      initialSuperAdminTrainingsState,
      loadSuperAdminTrainingDetailFailure({ error: 'boom' }),
    );
    expect(state.detail).toEqual({ data: null, isLoading: false, error: 'boom' });
  });

  it('resets detail to initial on clear', () => {
    const seeded = {
      ...initialSuperAdminTrainingsState,
      detail: { data: { id: 'x' } as any, isLoading: false, error: null },
    };
    const state = superAdminTrainingsReducer(seeded, clearSuperAdminTrainingDetail());
    expect(state.detail).toEqual(initialSuperAdminTrainingsState.detail);
  });

  it('tracks delete loading/error independently of the list', () => {
    let state = superAdminTrainingsReducer(
      initialSuperAdminTrainingsState,
      deleteSuperAdminTrainings({ ids: ['1'] }),
    );
    expect(state.deleteRequest.isLoading).toBe(true);

    state = superAdminTrainingsReducer(state, deleteSuperAdminTrainingsSuccess());
    expect(state.deleteRequest).toEqual({ isLoading: false, error: null });

    state = superAdminTrainingsReducer(state, deleteSuperAdminTrainingsFailure({ error: 'boom' }));
    expect(state.deleteRequest.error).toBe('boom');
  });

  it('tracks password-reset loading/error independently of the list', () => {
    let state = superAdminTrainingsReducer(
      initialSuperAdminTrainingsState,
      resetSuperAdminTrainingPassword({ id: '1', newPassword: 'x' }),
    );
    expect(state.passwordResetRequest.isLoading).toBe(true);

    state = superAdminTrainingsReducer(state, resetSuperAdminTrainingPasswordSuccess());
    expect(state.passwordResetRequest.isLoading).toBe(false);

    state = superAdminTrainingsReducer(
      state,
      resetSuperAdminTrainingPasswordFailure({ error: 'boom' }),
    );
    expect(state.passwordResetRequest.error).toBe('boom');
  });
});
