import {
  deleteSuperAdminClubs,
  deleteSuperAdminClubsFailure,
  deleteSuperAdminClubsSuccess,
  mergeSuperAdminClubs,
  mergeSuperAdminClubsFailure,
  mergeSuperAdminClubsSuccess,
  renameSuperAdminClub,
  renameSuperAdminClubFailure,
  renameSuperAdminClubSuccess,
  searchSuperAdminClubs,
  searchSuperAdminClubsFailure,
  searchSuperAdminClubsSuccess,
} from './superadmin-clubs.actions';
import { initialSuperAdminClubsState, superAdminClubsReducer } from './superadmin-clubs.reducer';

const CRITERIA = {
  page: 1,
  pageSize: 20,
  search: '',
  sortBy: 'name' as const,
  sortDir: 'ASC' as const,
};

describe('superAdminClubsReducer', () => {
  it('returns the initial state for an unknown action', () => {
    expect(superAdminClubsReducer(undefined, { type: '@@INIT' })).toEqual(
      initialSuperAdminClubsState,
    );
  });

  it('sets isLoading and stores the criteria on search', () => {
    const state = superAdminClubsReducer(
      initialSuperAdminClubsState,
      searchSuperAdminClubs({ criteria: CRITERIA }),
    );
    expect(state.list.isLoading).toBe(true);
    expect(state.list.criteria).toEqual(CRITERIA);
  });

  it('stores items and total on search success', () => {
    const items = [{ id: '1', name: 'Club A', playersCount: 3 }];
    const state = superAdminClubsReducer(
      initialSuperAdminClubsState,
      searchSuperAdminClubsSuccess({ items, total: 1 }),
    );
    expect(state.list.items).toEqual(items);
    expect(state.list.total).toBe(1);
  });

  it('stores the error on search failure', () => {
    const state = superAdminClubsReducer(
      initialSuperAdminClubsState,
      searchSuperAdminClubsFailure({ error: 'boom' }),
    );
    expect(state.list.error).toBe('boom');
  });

  it('tracks rename loading/error independently of the list', () => {
    let state = superAdminClubsReducer(
      initialSuperAdminClubsState,
      renameSuperAdminClub({ id: '1', name: 'New name' }),
    );
    expect(state.renameRequest.isLoading).toBe(true);

    state = superAdminClubsReducer(state, renameSuperAdminClubSuccess());
    expect(state.renameRequest.isLoading).toBe(false);

    state = superAdminClubsReducer(state, renameSuperAdminClubFailure({ error: 'dup' }));
    expect(state.renameRequest.error).toBe('dup');
  });

  it('tracks delete loading/error independently of the list', () => {
    let state = superAdminClubsReducer(
      initialSuperAdminClubsState,
      deleteSuperAdminClubs({ ids: ['1'] }),
    );
    expect(state.deleteRequest.isLoading).toBe(true);

    state = superAdminClubsReducer(state, deleteSuperAdminClubsSuccess());
    expect(state.deleteRequest.isLoading).toBe(false);

    state = superAdminClubsReducer(state, deleteSuperAdminClubsFailure({ error: 'boom' }));
    expect(state.deleteRequest.error).toBe('boom');
  });

  it('tracks merge pending/success/failure independently of the list', () => {
    let state = superAdminClubsReducer(
      initialSuperAdminClubsState,
      mergeSuperAdminClubs({ targetId: '1', sourceId: '2', newName: 'Palet Club' }),
    );
    expect(state.mergeRequest).toEqual({ isLoading: true, error: null });
    expect(state.list).toEqual(initialSuperAdminClubsState.list);

    state = superAdminClubsReducer(state, mergeSuperAdminClubsSuccess());
    expect(state.mergeRequest).toEqual({ isLoading: false, error: null });

    state = superAdminClubsReducer(state, mergeSuperAdminClubsFailure({ error: 'conflict' }));
    expect(state.mergeRequest).toEqual({ isLoading: false, error: 'conflict' });
  });

  it('clears a previous merge error when a new merge starts', () => {
    const failed = superAdminClubsReducer(
      initialSuperAdminClubsState,
      mergeSuperAdminClubsFailure({ error: 'conflict' }),
    );
    const state = superAdminClubsReducer(
      failed,
      mergeSuperAdminClubs({ targetId: '1', sourceId: '2' }),
    );
    expect(state.mergeRequest.error).toBeNull();
  });
});
