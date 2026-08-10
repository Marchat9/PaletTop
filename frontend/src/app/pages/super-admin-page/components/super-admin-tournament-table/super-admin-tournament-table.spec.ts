import { Dialog } from '@angular/cdk/dialog';
import { TestBed } from '@angular/core/testing';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { of } from 'rxjs';
import { TournamentStatus } from 'src/app/models/tournament-status.enum';
import { ConfirmationPopupComponent } from 'src/app/modales/confirmation-popup/confirmation-popup';
import { SuperAdminTournamentDeletePopupComponent } from 'src/app/modales/super-admin-tournament-delete-popup/super-admin-tournament-delete-popup';
import { SuperAdminTournamentDetailPopupComponent } from 'src/app/modales/super-admin-tournament-detail-popup/super-admin-tournament-detail-popup';
import { SuperAdminTournamentPasswordResetPopupComponent } from 'src/app/modales/super-admin-tournament-password-reset-popup/super-admin-tournament-password-reset-popup';
import { SuperAdminTournamentStatusPopupComponent } from 'src/app/modales/super-admin-tournament-status-popup/super-admin-tournament-status-popup';
import { SuperAdminTournamentSummaryDto } from 'src/app/services/super-admin-tournament.service';
import {
  deleteSuperAdminTournaments,
  searchSuperAdminTournaments,
} from 'src/app/store/superadmin-tournaments/superadmin-tournaments.actions';
import { SuperAdminTournamentTableComponent } from './super-admin-tournament-table';

const CRITERIA = {
  page: 1,
  pageSize: 20,
  search: '',
  status: null,
  sortBy: 'createdAt' as const,
  sortDir: 'DESC' as const,
};

const DRAFT_TOURNAMENT: SuperAdminTournamentSummaryDto = {
  id: 'id-draft',
  code: 'DRAFT-01',
  name: 'Tournoi Brouillon',
  status: TournamentStatus.DRAFT,
  date: '2026-08-10',
  teamsCount: 4,
  createdAt: '2026-08-01T10:00:00.000Z',
};

const ACTIVE_TOURNAMENT: SuperAdminTournamentSummaryDto = {
  id: 'id-active',
  code: 'ACTIVE-01',
  name: 'Tournoi Actif',
  status: TournamentStatus.ACTIVE,
  date: '2026-08-10',
  teamsCount: 6,
  createdAt: '2026-08-02T10:00:00.000Z',
};

function setup(
  items: SuperAdminTournamentSummaryDto[] = [DRAFT_TOURNAMENT, ACTIVE_TOURNAMENT],
  closedValue: unknown = true,
) {
  const dialogMock = { open: vi.fn().mockReturnValue({ closed: of(closedValue) }) };

  TestBed.configureTestingModule({
    imports: [SuperAdminTournamentTableComponent],
    providers: [
      { provide: Dialog, useValue: dialogMock },
      provideMockStore({
        initialState: {
          superAdminTournaments: {
            list: { items, total: items.length, criteria: CRITERIA, isLoading: false, error: null },
            detail: { data: null, isLoading: false, error: null },
            deleteRequest: { isLoading: false, error: null },
            statusChangeRequest: { isLoading: false, error: null },
            passwordResetRequest: { isLoading: false, error: null },
          },
        },
      }),
    ],
  });

  const store = TestBed.inject(MockStore);
  vi.spyOn(store, 'dispatch');

  const fixture = TestBed.createComponent(SuperAdminTournamentTableComponent);
  fixture.detectChanges();
  return { fixture, dialogMock, store };
}

describe('SuperAdminTournamentTableComponent', () => {
  it('dispatches a search on init with page 1', () => {
    const { store } = setup();
    expect(store.dispatch).toHaveBeenCalledWith(
      searchSuperAdminTournaments({ criteria: { ...CRITERIA, page: 1, search: '', status: null } }),
    );
  });

  it('dispatches a trimmed search on search input', () => {
    const { fixture, store } = setup();
    (store.dispatch as unknown as { mockClear: () => void }).mockClear();

    fixture.componentInstance.onSearchInput('  chandeleur  ');

    expect(store.dispatch).toHaveBeenCalledWith(
      searchSuperAdminTournaments({
        criteria: { ...CRITERIA, page: 1, search: 'chandeleur', status: null },
      }),
    );
  });

  it('clears the selection when a search is typed, so a selection can never span result sets', () => {
    const { fixture, store } = setup();
    fixture.componentInstance.toggleSelect(DRAFT_TOURNAMENT.id, true);
    expect(fixture.componentInstance.selectedCount()).toBe(1);
    (store.dispatch as unknown as { mockClear: () => void }).mockClear();

    fixture.componentInstance.onSearchInput('chandeleur');

    expect(fixture.componentInstance.selectedCount()).toBe(0);
    expect(store.dispatch).toHaveBeenCalledWith(
      searchSuperAdminTournaments({
        criteria: { ...CRITERIA, page: 1, search: 'chandeleur', status: null },
      }),
    );
  });

  it('clears the selection and re-searches when the status filter changes', () => {
    const { fixture, store } = setup();
    fixture.componentInstance.toggleSelect(DRAFT_TOURNAMENT.id, true);
    expect(fixture.componentInstance.selectedCount()).toBe(1);
    (store.dispatch as unknown as { mockClear: () => void }).mockClear();

    fixture.componentInstance.onStatusFilterChange(TournamentStatus.ACTIVE);

    expect(fixture.componentInstance.selectedCount()).toBe(0);
    expect(store.dispatch).toHaveBeenCalledWith(
      searchSuperAdminTournaments({
        criteria: { ...CRITERIA, page: 1, search: '', status: TournamentStatus.ACTIVE },
      }),
    );
  });

  it('applyStatusFilter sets the status filter and re-searches (used by stat tile clicks)', () => {
    const { fixture, store } = setup();
    (store.dispatch as unknown as { mockClear: () => void }).mockClear();

    fixture.componentInstance.applyStatusFilter(TournamentStatus.DRAFT);

    expect(fixture.componentInstance.statusFilter()).toBe(TournamentStatus.DRAFT);
    expect(store.dispatch).toHaveBeenCalledWith(
      searchSuperAdminTournaments({
        criteria: { ...CRITERIA, page: 1, search: '', status: TournamentStatus.DRAFT },
      }),
    );
  });

  it('toggles sort direction on the same column and resets to ASC on a new column', () => {
    const { fixture, store } = setup();
    (store.dispatch as unknown as { mockClear: () => void }).mockClear();

    fixture.componentInstance.onSort('name');
    expect(store.dispatch).toHaveBeenCalledWith(
      searchSuperAdminTournaments({ criteria: { ...CRITERIA, sortBy: 'name', sortDir: 'ASC' } }),
    );
  });

  it('clears the selection when the sort changes, so a selection can never span sort orders', () => {
    const { fixture, store } = setup();
    fixture.componentInstance.toggleSelect(DRAFT_TOURNAMENT.id, true);
    expect(fixture.componentInstance.selectedCount()).toBe(1);
    (store.dispatch as unknown as { mockClear: () => void }).mockClear();

    fixture.componentInstance.onSort('name');

    expect(fixture.componentInstance.selectedCount()).toBe(0);
    expect(store.dispatch).toHaveBeenCalledWith(
      searchSuperAdminTournaments({ criteria: { ...CRITERIA, sortBy: 'name', sortDir: 'ASC' } }),
    );
  });

  it('clears the selection when the page changes, so a selection can never span pages', () => {
    const { fixture, store } = setup();
    fixture.componentInstance.toggleSelect(DRAFT_TOURNAMENT.id, true);
    expect(fixture.componentInstance.selectedCount()).toBe(1);
    (store.dispatch as unknown as { mockClear: () => void }).mockClear();

    fixture.componentInstance.onPageChange(2);

    expect(fixture.componentInstance.selectedCount()).toBe(0);
    expect(store.dispatch).toHaveBeenCalledWith(
      searchSuperAdminTournaments({ criteria: { ...CRITERIA, page: 2, search: '', status: null } }),
    );
  });

  it('toggleSelectAll selects every item and clears with false', () => {
    const { fixture } = setup();

    fixture.componentInstance.toggleSelectAll(true);
    expect(fixture.componentInstance.selectedCount()).toBe(2);
    expect(fixture.componentInstance.selectedIds().has(DRAFT_TOURNAMENT.id)).toBe(true);

    fixture.componentInstance.toggleSelectAll(false);
    expect(fixture.componentInstance.selectedCount()).toBe(0);
  });

  it('opens the detail popup with the tournament id', () => {
    const { fixture, dialogMock } = setup();

    fixture.componentInstance.openDetail(DRAFT_TOURNAMENT);

    expect(dialogMock.open).toHaveBeenCalledWith(
      SuperAdminTournamentDetailPopupComponent,
      expect.objectContaining({ data: { id: DRAFT_TOURNAMENT.id } }),
    );
  });

  it('opens the password reset popup with id, code, and name', () => {
    const { fixture, dialogMock } = setup();

    fixture.componentInstance.openPasswordReset(DRAFT_TOURNAMENT);

    expect(dialogMock.open).toHaveBeenCalledWith(
      SuperAdminTournamentPasswordResetPopupComponent,
      expect.objectContaining({
        data: { id: DRAFT_TOURNAMENT.id, code: DRAFT_TOURNAMENT.code, name: DRAFT_TOURNAMENT.name },
      }),
    );
  });

  it('deleting a DRAFT tournament opens the plain confirmation popup', () => {
    const { fixture, dialogMock } = setup();

    fixture.componentInstance.deleteOne(DRAFT_TOURNAMENT);

    expect(dialogMock.open).toHaveBeenCalledWith(ConfirmationPopupComponent, expect.anything());
  });

  it('deleting an ACTIVE tournament opens the reinforced delete popup instead', () => {
    const { fixture, dialogMock } = setup();

    fixture.componentInstance.deleteOne(ACTIVE_TOURNAMENT);

    expect(dialogMock.open).toHaveBeenCalledWith(
      SuperAdminTournamentDeletePopupComponent,
      expect.objectContaining({
        data: {
          id: ACTIVE_TOURNAMENT.id,
          code: ACTIVE_TOURNAMENT.code,
          name: ACTIVE_TOURNAMENT.name,
        },
      }),
    );
  });

  it('dispatches deleteSuperAdminTournaments and clears selection when the bulk delete is confirmed', () => {
    const { fixture, store } = setup();
    fixture.componentInstance.toggleSelect(DRAFT_TOURNAMENT.id, true);
    (store.dispatch as unknown as { mockClear: () => void }).mockClear();

    fixture.componentInstance.deleteSelection();

    expect(store.dispatch).toHaveBeenCalledWith(
      deleteSuperAdminTournaments({ ids: [DRAFT_TOURNAMENT.id] }),
    );
    expect(fixture.componentInstance.selectedCount()).toBe(0);
  });

  it('bulk-deleting a selection with no ACTIVE tournaments shows the plain confirmation message', () => {
    const { fixture, dialogMock } = setup();
    fixture.componentInstance.toggleSelect(DRAFT_TOURNAMENT.id, true);

    fixture.componentInstance.deleteSelection();

    expect(dialogMock.open).toHaveBeenCalledWith(
      ConfirmationPopupComponent,
      expect.objectContaining({
        data: expect.objectContaining({
          message: 'Supprimer les 1 tournois sélectionnés ? Cette action est irréversible.',
        }),
      }),
    );
  });

  it('bulk-deleting a selection that includes an ACTIVE tournament shows the "at least one active" warning', () => {
    const { fixture, dialogMock } = setup();
    fixture.componentInstance.toggleSelect(DRAFT_TOURNAMENT.id, true);
    fixture.componentInstance.toggleSelect(ACTIVE_TOURNAMENT.id, true);

    fixture.componentInstance.deleteSelection();

    expect(dialogMock.open).toHaveBeenCalledWith(
      ConfirmationPopupComponent,
      expect.objectContaining({
        data: expect.objectContaining({
          message: expect.stringContaining('dont au moins un tournoi actif'),
        }),
      }),
    );
  });

  it('does not dispatch a bulk delete when the confirmation popup is dismissed', () => {
    const { fixture, store } = setup([DRAFT_TOURNAMENT, ACTIVE_TOURNAMENT], false);
    fixture.componentInstance.toggleSelect(DRAFT_TOURNAMENT.id, true);
    (store.dispatch as unknown as { mockClear: () => void }).mockClear();

    fixture.componentInstance.deleteSelection();

    expect(store.dispatch).not.toHaveBeenCalled();
    expect(fixture.componentInstance.selectedCount()).toBe(1);
  });

  it('opens the status popup for the current selection and clears it on confirm', () => {
    const { fixture, dialogMock } = setup();
    fixture.componentInstance.toggleSelect(DRAFT_TOURNAMENT.id, true);
    fixture.componentInstance.toggleSelect(ACTIVE_TOURNAMENT.id, true);

    fixture.componentInstance.changeSelectionStatus();

    expect(dialogMock.open).toHaveBeenCalledWith(
      SuperAdminTournamentStatusPopupComponent,
      expect.objectContaining({ data: { ids: [DRAFT_TOURNAMENT.id, ACTIVE_TOURNAMENT.id] } }),
    );
    expect(fixture.componentInstance.selectedCount()).toBe(0);
  });
});
