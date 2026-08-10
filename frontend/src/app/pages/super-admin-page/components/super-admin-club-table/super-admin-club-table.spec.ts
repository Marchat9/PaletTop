import { TestBed } from '@angular/core/testing';
import { SuperAdminClubSummaryDto } from 'src/app/services/super-admin-club.service';
import { SuperAdminClubSearchCriteria } from 'src/app/store/superadmin-clubs/superadmin-clubs.actions';
import { SuperAdminClubsListState } from 'src/app/store/superadmin-clubs/superadmin-clubs.reducer';
import { SuperAdminClubTableComponent } from './super-admin-club-table';

const CRITERIA: SuperAdminClubSearchCriteria = {
  page: 1,
  pageSize: 20,
  search: '',
  sortBy: 'name',
  sortDir: 'ASC',
};

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

function listState(
  items: SuperAdminClubSummaryDto[] = [CLUB_WITH_PLAYERS, CLUB_WITHOUT_PLAYERS],
  criteria: SuperAdminClubSearchCriteria = CRITERIA,
): SuperAdminClubsListState {
  return { items, total: items.length, criteria, isLoading: false, error: null };
}

function setup(items: SuperAdminClubSummaryDto[] = [CLUB_WITH_PLAYERS, CLUB_WITHOUT_PLAYERS]) {
  TestBed.configureTestingModule({ imports: [SuperAdminClubTableComponent] });
  const fixture = TestBed.createComponent(SuperAdminClubTableComponent);
  fixture.componentRef.setInput('list', listState(items));
  fixture.detectChanges();
  return { fixture };
}

describe('SuperAdminClubTableComponent', () => {
  it('emits searchRequested with page 1 and the trimmed term on search input', () => {
    const { fixture } = setup();
    const emitted: SuperAdminClubSearchCriteria[] = [];
    fixture.componentInstance.searchRequested.subscribe((criteria) => emitted.push(criteria));

    fixture.componentInstance.onSearchInput('  nantes  ');

    expect(emitted).toEqual([{ ...CRITERIA, page: 1, search: 'nantes' }]);
  });

  it('toggles sort direction on the same column and resets to ASC on a new column', () => {
    const { fixture } = setup();
    const emitted: SuperAdminClubSearchCriteria[] = [];
    fixture.componentInstance.searchRequested.subscribe((criteria) => emitted.push(criteria));

    fixture.componentInstance.onSort('playersCount');

    expect(emitted).toEqual([{ ...CRITERIA, sortBy: 'playersCount', sortDir: 'ASC' }]);
  });

  it('emits searchRequested with the new page on page change', () => {
    const { fixture } = setup();
    const emitted: SuperAdminClubSearchCriteria[] = [];
    fixture.componentInstance.searchRequested.subscribe((criteria) => emitted.push(criteria));

    fixture.componentInstance.onPageChange(2);

    expect(emitted).toEqual([{ ...CRITERIA, page: 2 }]);
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

  it('prunes the selection to ids still present whenever the list input changes', () => {
    const { fixture } = setup();
    fixture.componentInstance.toggleSelect(CLUB_WITH_PLAYERS.id, true);
    fixture.componentInstance.toggleSelect(CLUB_WITHOUT_PLAYERS.id, true);
    expect(fixture.componentInstance.selectedCount()).toBe(2);

    // Simulates the parent re-rendering after CLUB_WITH_PLAYERS was deleted individually
    // (or after a page/search/sort change that no longer includes it).
    fixture.componentRef.setInput('list', listState([CLUB_WITHOUT_PLAYERS]));
    fixture.detectChanges();

    expect(fixture.componentInstance.selectedCount()).toBe(1);
    expect(fixture.componentInstance.selectedIds().has(CLUB_WITHOUT_PLAYERS.id)).toBe(true);
    expect(fixture.componentInstance.selectedIds().has(CLUB_WITH_PLAYERS.id)).toBe(false);
  });

  it('emits renameRequested with the club', () => {
    const { fixture } = setup();
    const emitted: SuperAdminClubSummaryDto[] = [];
    fixture.componentInstance.renameRequested.subscribe((club) => emitted.push(club));

    fixture.componentInstance.openRename(CLUB_WITH_PLAYERS);

    expect(emitted).toEqual([CLUB_WITH_PLAYERS]);
  });

  it('emits deleteOneRequested with the club', () => {
    const { fixture } = setup();
    const emitted: SuperAdminClubSummaryDto[] = [];
    fixture.componentInstance.deleteOneRequested.subscribe((club) => emitted.push(club));

    fixture.componentInstance.deleteOne(CLUB_WITHOUT_PLAYERS);

    expect(emitted).toEqual([CLUB_WITHOUT_PLAYERS]);
  });

  it('emits deleteSelectionRequested with the selected ids', () => {
    const { fixture } = setup();
    fixture.componentInstance.toggleSelect(CLUB_WITH_PLAYERS.id, true);
    const emitted: string[][] = [];
    fixture.componentInstance.deleteSelectionRequested.subscribe((ids) => emitted.push(ids));

    fixture.componentInstance.deleteSelection();

    expect(emitted).toEqual([[CLUB_WITH_PLAYERS.id]]);
  });
});
