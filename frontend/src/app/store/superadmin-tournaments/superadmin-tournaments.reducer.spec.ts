import { TournamentStatus } from 'src/app/models/tournament-status.enum';
import {
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
import {
  initialSuperAdminTournamentsState,
  superAdminTournamentsReducer,
} from './superadmin-tournaments.reducer';

const CRITERIA = {
  page: 1,
  pageSize: 20,
  search: '',
  status: null,
  sortBy: 'createdAt' as const,
  sortDir: 'DESC' as const,
};

describe('superAdminTournamentsReducer', () => {
  it('returns the initial state for an unknown action', () => {
    expect(superAdminTournamentsReducer(undefined, { type: '@@INIT' })).toEqual(
      initialSuperAdminTournamentsState,
    );
  });

  it('sets isLoading and stores the criteria on search', () => {
    const state = superAdminTournamentsReducer(
      initialSuperAdminTournamentsState,
      searchSuperAdminTournaments({ criteria: CRITERIA }),
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
        status: TournamentStatus.DRAFT,
        date: '2026-01-01',
        teamsCount: 0,
        createdAt: '2026-01-01',
      },
    ];
    const state = superAdminTournamentsReducer(
      initialSuperAdminTournamentsState,
      searchSuperAdminTournamentsSuccess({ items, total: 1 }),
    );
    expect(state.list.items).toEqual(items);
    expect(state.list.total).toBe(1);
    expect(state.list.isLoading).toBe(false);
  });

  it('stores the error on search failure', () => {
    const state = superAdminTournamentsReducer(
      initialSuperAdminTournamentsState,
      searchSuperAdminTournamentsFailure({ error: 'boom' }),
    );
    expect(state.list.isLoading).toBe(false);
    expect(state.list.error).toBe('boom');
  });

  it('clears the selection and previous detail data when a detail load starts', () => {
    const seeded = {
      ...initialSuperAdminTournamentsState,
      detail: { data: { id: 'old' } as any, isLoading: false, error: null },
    };
    const state = superAdminTournamentsReducer(seeded, loadSuperAdminTournamentDetail({ id: '2' }));
    expect(state.detail).toEqual({ data: null, isLoading: true, error: null });
  });

  it('stores the tournament on detail success', () => {
    const tournament = { id: '2' } as any;
    const state = superAdminTournamentsReducer(
      initialSuperAdminTournamentsState,
      loadSuperAdminTournamentDetailSuccess({ tournament }),
    );
    expect(state.detail).toEqual({ data: tournament, isLoading: false, error: null });
  });

  it('stores the error on detail failure', () => {
    const state = superAdminTournamentsReducer(
      initialSuperAdminTournamentsState,
      loadSuperAdminTournamentDetailFailure({ error: 'boom' }),
    );
    expect(state.detail).toEqual({ data: null, isLoading: false, error: 'boom' });
  });

  it('resets detail to initial on clear', () => {
    const seeded = {
      ...initialSuperAdminTournamentsState,
      detail: { data: { id: 'x' } as any, isLoading: false, error: null },
    };
    const state = superAdminTournamentsReducer(seeded, clearSuperAdminTournamentDetail());
    expect(state.detail).toEqual(initialSuperAdminTournamentsState.detail);
  });

  it('tracks delete loading/error independently of the list', () => {
    let state = superAdminTournamentsReducer(
      initialSuperAdminTournamentsState,
      deleteSuperAdminTournaments({ ids: ['1'] }),
    );
    expect(state.deleteRequest.isLoading).toBe(true);

    state = superAdminTournamentsReducer(state, deleteSuperAdminTournamentsSuccess());
    expect(state.deleteRequest.isLoading).toBe(false);
    expect(state.deleteRequest.error).toBeNull();

    state = superAdminTournamentsReducer(
      state,
      deleteSuperAdminTournamentsFailure({ error: 'boom' }),
    );
    expect(state.deleteRequest.error).toBe('boom');
  });

  it('tracks status-change loading/error independently of the list', () => {
    let state = superAdminTournamentsReducer(
      initialSuperAdminTournamentsState,
      changeSuperAdminTournamentsStatus({ ids: ['1'], status: TournamentStatus.CANCELLED }),
    );
    expect(state.statusChangeRequest.isLoading).toBe(true);

    state = superAdminTournamentsReducer(state, changeSuperAdminTournamentsStatusSuccess());
    expect(state.statusChangeRequest.isLoading).toBe(false);

    state = superAdminTournamentsReducer(
      state,
      changeSuperAdminTournamentsStatusFailure({ error: 'boom' }),
    );
    expect(state.statusChangeRequest.error).toBe('boom');
  });

  it('tracks password-reset loading/error independently of the list', () => {
    let state = superAdminTournamentsReducer(
      initialSuperAdminTournamentsState,
      resetSuperAdminTournamentPassword({ id: '1', newPassword: 'x' }),
    );
    expect(state.passwordResetRequest.isLoading).toBe(true);

    state = superAdminTournamentsReducer(state, resetSuperAdminTournamentPasswordSuccess());
    expect(state.passwordResetRequest.isLoading).toBe(false);

    state = superAdminTournamentsReducer(
      state,
      resetSuperAdminTournamentPasswordFailure({ error: 'boom' }),
    );
    expect(state.passwordResetRequest.error).toBe('boom');
  });
});
