import { TestBed } from '@angular/core/testing';
import { TournamentStatus } from 'src/app/models/tournament-status.enum';
import { SuperAdminTournamentSummaryDto } from 'src/app/services/super-admin-tournament.service';
import { SuperAdminTournamentSearchCriteria } from 'src/app/store/superadmin-tournaments/superadmin-tournaments.actions';
import { SuperAdminTournamentsListState } from 'src/app/store/superadmin-tournaments/superadmin-tournaments.reducer';
import { SuperAdminTournamentTableComponent } from './super-admin-tournament-table';

const CRITERIA: SuperAdminTournamentSearchCriteria = {
  page: 1,
  pageSize: 20,
  search: '',
  status: null,
  sortBy: 'createdAt',
  sortDir: 'DESC',
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

function listState(
  items: SuperAdminTournamentSummaryDto[] = [DRAFT_TOURNAMENT, ACTIVE_TOURNAMENT],
  criteria: SuperAdminTournamentSearchCriteria = CRITERIA,
): SuperAdminTournamentsListState {
  return { items, total: items.length, criteria, isLoading: false, error: null };
}

function setup(items: SuperAdminTournamentSummaryDto[] = [DRAFT_TOURNAMENT, ACTIVE_TOURNAMENT]) {
  TestBed.configureTestingModule({ imports: [SuperAdminTournamentTableComponent] });
  const fixture = TestBed.createComponent(SuperAdminTournamentTableComponent);
  fixture.componentRef.setInput('list', listState(items));
  fixture.detectChanges();
  return { fixture };
}

describe('SuperAdminTournamentTableComponent', () => {
  it('emits searchRequested with page 1 and the trimmed term on search input', () => {
    const { fixture } = setup();
    const emitted: SuperAdminTournamentSearchCriteria[] = [];
    fixture.componentInstance.searchRequested.subscribe((criteria) => emitted.push(criteria));

    fixture.componentInstance.onSearchInput('  chandeleur  ');

    expect(emitted).toEqual([{ ...CRITERIA, page: 1, search: 'chandeleur' }]);
  });

  it('emits searchRequested with page 1 and the new status on status filter change', () => {
    const { fixture } = setup();
    const emitted: SuperAdminTournamentSearchCriteria[] = [];
    fixture.componentInstance.searchRequested.subscribe((criteria) => emitted.push(criteria));

    fixture.componentInstance.onStatusFilterChange(TournamentStatus.ACTIVE);

    expect(emitted).toEqual([{ ...CRITERIA, page: 1, status: TournamentStatus.ACTIVE }]);
  });

  it('toggles sort direction on the same column and resets to ASC on a new column', () => {
    const { fixture } = setup();
    const emitted: SuperAdminTournamentSearchCriteria[] = [];
    fixture.componentInstance.searchRequested.subscribe((criteria) => emitted.push(criteria));

    fixture.componentInstance.onSort('name');
    expect(emitted).toEqual([{ ...CRITERIA, sortBy: 'name', sortDir: 'ASC' }]);
  });

  it('emits searchRequested with the new page on page change', () => {
    const { fixture } = setup();
    const emitted: SuperAdminTournamentSearchCriteria[] = [];
    fixture.componentInstance.searchRequested.subscribe((criteria) => emitted.push(criteria));

    fixture.componentInstance.onPageChange(2);

    expect(emitted).toEqual([{ ...CRITERIA, page: 2 }]);
  });

  it('toggleSelectAll selects every item and clears with false', () => {
    const { fixture } = setup();

    fixture.componentInstance.toggleSelectAll(true);
    expect(fixture.componentInstance.selectedCount()).toBe(2);
    expect(fixture.componentInstance.selectedIds().has(DRAFT_TOURNAMENT.id)).toBe(true);

    fixture.componentInstance.toggleSelectAll(false);
    expect(fixture.componentInstance.selectedCount()).toBe(0);
  });

  it('prunes the selection to ids still present whenever the list input changes', () => {
    const { fixture } = setup();
    fixture.componentInstance.toggleSelect(DRAFT_TOURNAMENT.id, true);
    fixture.componentInstance.toggleSelect(ACTIVE_TOURNAMENT.id, true);
    expect(fixture.componentInstance.selectedCount()).toBe(2);

    // Simulates the parent re-rendering after DRAFT_TOURNAMENT was deleted individually
    // (or after a page/search/sort/filter change that no longer includes it).
    fixture.componentRef.setInput('list', listState([ACTIVE_TOURNAMENT]));
    fixture.detectChanges();

    expect(fixture.componentInstance.selectedCount()).toBe(1);
    expect(fixture.componentInstance.selectedIds().has(ACTIVE_TOURNAMENT.id)).toBe(true);
    expect(fixture.componentInstance.selectedIds().has(DRAFT_TOURNAMENT.id)).toBe(false);
  });

  it('emits detailRequested with the tournament id', () => {
    const { fixture } = setup();
    const emitted: string[] = [];
    fixture.componentInstance.detailRequested.subscribe((id) => emitted.push(id));

    fixture.componentInstance.openDetail(DRAFT_TOURNAMENT);

    expect(emitted).toEqual([DRAFT_TOURNAMENT.id]);
  });

  it('emits passwordResetRequested with the tournament', () => {
    const { fixture } = setup();
    const emitted: SuperAdminTournamentSummaryDto[] = [];
    fixture.componentInstance.passwordResetRequested.subscribe((tournament) =>
      emitted.push(tournament),
    );

    fixture.componentInstance.openPasswordReset(DRAFT_TOURNAMENT);

    expect(emitted).toEqual([DRAFT_TOURNAMENT]);
  });

  it('emits deleteOneRequested with the tournament', () => {
    const { fixture } = setup();
    const emitted: SuperAdminTournamentSummaryDto[] = [];
    fixture.componentInstance.deleteOneRequested.subscribe((tournament) =>
      emitted.push(tournament),
    );

    fixture.componentInstance.deleteOne(ACTIVE_TOURNAMENT);

    expect(emitted).toEqual([ACTIVE_TOURNAMENT]);
  });

  it('emits deleteSelectionRequested with the selected ids', () => {
    const { fixture } = setup();
    fixture.componentInstance.toggleSelect(DRAFT_TOURNAMENT.id, true);
    const emitted: string[][] = [];
    fixture.componentInstance.deleteSelectionRequested.subscribe((ids) => emitted.push(ids));

    fixture.componentInstance.deleteSelection();

    expect(emitted).toEqual([[DRAFT_TOURNAMENT.id]]);
  });

  it('emits statusChangeRequested with the selected ids', () => {
    const { fixture } = setup();
    fixture.componentInstance.toggleSelect(DRAFT_TOURNAMENT.id, true);
    fixture.componentInstance.toggleSelect(ACTIVE_TOURNAMENT.id, true);
    const emitted: string[][] = [];
    fixture.componentInstance.statusChangeRequested.subscribe((ids) => emitted.push(ids));

    fixture.componentInstance.changeSelectionStatus();

    expect(emitted).toEqual([[DRAFT_TOURNAMENT.id, ACTIVE_TOURNAMENT.id]]);
  });
});
