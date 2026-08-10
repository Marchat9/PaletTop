import { Dialog } from '@angular/cdk/dialog';
import { TestBed } from '@angular/core/testing';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { of } from 'rxjs';
import { ConfirmationPopupComponent } from 'src/app/modales/confirmation-popup/confirmation-popup';
import { SuperAdminClubRenamePopupComponent } from 'src/app/modales/super-admin-club-rename-popup/super-admin-club-rename-popup';
import { SuperAdminClubSummaryDto } from 'src/app/services/super-admin-club.service';
import {
  deleteSuperAdminClubs,
  searchSuperAdminClubs,
} from 'src/app/store/superadmin-clubs/superadmin-clubs.actions';
import { SuperAdminClubTableComponent } from './super-admin-club-table';

const CRITERIA = { page: 1, pageSize: 20, search: '' };

const CLUB_WITH_PLAYERS: SuperAdminClubSummaryDto = {
  id: 'id-with-players',
  name: 'Palet Club Nantais',
  playersCount: 3,
};

const CLUB_WITHOUT_PLAYERS: SuperAdminClubSummaryDto = {
  id: 'id-without-players',
  name: 'Saint-Étienne',
  playersCount: 0,
};

function setup(
  items: SuperAdminClubSummaryDto[] = [CLUB_WITH_PLAYERS, CLUB_WITHOUT_PLAYERS],
  closedValue: unknown = true,
) {
  const dialogMock = { open: vi.fn().mockReturnValue({ closed: of(closedValue) }) };

  TestBed.configureTestingModule({
    imports: [SuperAdminClubTableComponent],
    providers: [
      { provide: Dialog, useValue: dialogMock },
      provideMockStore({
        initialState: {
          superAdminClubs: {
            list: { items, total: items.length, criteria: CRITERIA, isLoading: false, error: null },
            renameRequest: { isLoading: false, error: null },
            deleteRequest: { isLoading: false, error: null },
          },
        },
      }),
    ],
  });

  const store = TestBed.inject(MockStore);
  vi.spyOn(store, 'dispatch');

  const fixture = TestBed.createComponent(SuperAdminClubTableComponent);
  fixture.detectChanges();
  return { fixture, dialogMock, store };
}

describe('SuperAdminClubTableComponent', () => {
  it('dispatches a search on init with page 1', () => {
    const { store } = setup();
    expect(store.dispatch).toHaveBeenCalledWith(
      searchSuperAdminClubs({ criteria: { ...CRITERIA, page: 1, search: '' } }),
    );
  });

  it('dispatches a trimmed search on search input and clears the selection', () => {
    const { fixture, store } = setup();
    fixture.componentInstance.toggleSelect(CLUB_WITH_PLAYERS.id, true);
    expect(fixture.componentInstance.selectedCount()).toBe(1);
    (store.dispatch as unknown as { mockClear: () => void }).mockClear();

    fixture.componentInstance.onSearchInput('  nantes  ');

    expect(fixture.componentInstance.selectedCount()).toBe(0);
    expect(store.dispatch).toHaveBeenCalledWith(
      searchSuperAdminClubs({ criteria: { ...CRITERIA, page: 1, search: 'nantes' } }),
    );
  });

  it('clears the selection when the page changes, so a selection can never span pages', () => {
    const { fixture, store } = setup();
    fixture.componentInstance.toggleSelect(CLUB_WITH_PLAYERS.id, true);
    expect(fixture.componentInstance.selectedCount()).toBe(1);
    (store.dispatch as unknown as { mockClear: () => void }).mockClear();

    fixture.componentInstance.onPageChange(2);

    expect(fixture.componentInstance.selectedCount()).toBe(0);
    expect(store.dispatch).toHaveBeenCalledWith(
      searchSuperAdminClubs({ criteria: { ...CRITERIA, page: 2, search: '' } }),
    );
  });

  it('toggleSelect tracks individual selection', () => {
    const { fixture } = setup();

    expect(fixture.componentInstance.selectedIds().has(CLUB_WITH_PLAYERS.id)).toBe(false);

    fixture.componentInstance.toggleSelect(CLUB_WITH_PLAYERS.id, true);
    expect(fixture.componentInstance.selectedIds().has(CLUB_WITH_PLAYERS.id)).toBe(true);
    expect(fixture.componentInstance.selectedCount()).toBe(1);

    fixture.componentInstance.toggleSelect(CLUB_WITH_PLAYERS.id, false);
    expect(fixture.componentInstance.selectedIds().has(CLUB_WITH_PLAYERS.id)).toBe(false);
    expect(fixture.componentInstance.selectedCount()).toBe(0);
  });

  it('toggleSelectAll selects every item and clears with false', () => {
    const { fixture } = setup();

    fixture.componentInstance.toggleSelectAll(true);
    expect(fixture.componentInstance.selectedCount()).toBe(2);
    expect(fixture.componentInstance.selectedIds().has(CLUB_WITH_PLAYERS.id)).toBe(true);
    expect(fixture.componentInstance.selectedIds().has(CLUB_WITHOUT_PLAYERS.id)).toBe(true);

    fixture.componentInstance.toggleSelectAll(false);
    expect(fixture.componentInstance.selectedCount()).toBe(0);
  });

  it('opens the rename popup with the club id and name', () => {
    const { fixture, dialogMock } = setup();

    fixture.componentInstance.openRename(CLUB_WITH_PLAYERS);

    expect(dialogMock.open).toHaveBeenCalledWith(
      SuperAdminClubRenamePopupComponent,
      expect.objectContaining({
        data: { id: CLUB_WITH_PLAYERS.id, name: CLUB_WITH_PLAYERS.name },
      }),
    );
  });

  it('deleting a club with players attached warns about dissociation in the confirmation message', () => {
    const { fixture, dialogMock } = setup();

    fixture.componentInstance.deleteOne(CLUB_WITH_PLAYERS);

    expect(dialogMock.open).toHaveBeenCalledWith(
      ConfirmationPopupComponent,
      expect.objectContaining({
        data: expect.objectContaining({
          message: expect.stringContaining('3 joueur(s) actuellement rattachés seront dissociés'),
        }),
      }),
    );
  });

  it('deleting a club with no players attached uses the "no players" wording instead', () => {
    const { fixture, dialogMock } = setup();

    fixture.componentInstance.deleteOne(CLUB_WITHOUT_PLAYERS);

    expect(dialogMock.open).toHaveBeenCalledWith(
      ConfirmationPopupComponent,
      expect.objectContaining({
        data: expect.objectContaining({
          message: expect.stringContaining("Aucun joueur n'y est rattaché"),
        }),
      }),
    );
  });

  it('dispatches deleteSuperAdminClubs for the selected ids and clears the selection when the bulk delete is confirmed', () => {
    const { fixture, store } = setup();
    fixture.componentInstance.toggleSelect(CLUB_WITH_PLAYERS.id, true);
    (store.dispatch as unknown as { mockClear: () => void }).mockClear();

    fixture.componentInstance.deleteSelection();

    expect(store.dispatch).toHaveBeenCalledWith(
      deleteSuperAdminClubs({ ids: [CLUB_WITH_PLAYERS.id] }),
    );
    expect(fixture.componentInstance.selectedCount()).toBe(0);
  });

  it('does not dispatch a bulk delete and keeps the selection when the confirmation popup is dismissed', () => {
    const { fixture, store } = setup([CLUB_WITH_PLAYERS, CLUB_WITHOUT_PLAYERS], false);
    fixture.componentInstance.toggleSelect(CLUB_WITH_PLAYERS.id, true);
    (store.dispatch as unknown as { mockClear: () => void }).mockClear();

    fixture.componentInstance.deleteSelection();

    expect(store.dispatch).not.toHaveBeenCalled();
    expect(fixture.componentInstance.selectedCount()).toBe(1);
  });
});
