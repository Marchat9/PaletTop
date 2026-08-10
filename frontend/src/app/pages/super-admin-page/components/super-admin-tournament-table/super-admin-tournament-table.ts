import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  output,
  signal,
} from '@angular/core';
import { TournamentStatus } from 'src/app/models/tournament-status.enum';
import { SuperAdminTournamentSummaryDto } from 'src/app/services/super-admin-tournament.service';
import { Button } from 'src/app/shared/button/button';
import { ButtonIcon } from 'src/app/shared/button-icon/button-icon';
import { CardCollapsible } from 'src/app/shared/card-collapsible/card-collapsible';
import { Icon } from 'src/app/shared/icon/icon';
import { InputSelect, InputSelectOption } from 'src/app/shared/input-select/input-select';
import { InputText } from 'src/app/shared/input-text/input-text';
import {
  SuperAdminTournamentSearchCriteria,
  SuperAdminTournamentSortBy,
} from 'src/app/store/superadmin-tournaments/superadmin-tournaments.actions';
import { SuperAdminTournamentsListState } from 'src/app/store/superadmin-tournaments/superadmin-tournaments.reducer';
import {
  computeSortState,
  computeTotalPages,
  nextSortDirection,
  pruneSelection,
  selectAll,
  toggleSelection,
} from '../super-admin-table.utils';

const STATUS_LABELS: Record<TournamentStatus, string> = {
  [TournamentStatus.DRAFT]: 'Brouillon',
  [TournamentStatus.ACTIVE]: 'Actif',
  [TournamentStatus.FINISHED]: 'Terminé',
  [TournamentStatus.CANCELLED]: 'Annulé',
};

const STATUS_FILTER_OPTIONS: InputSelectOption[] = [
  { value: '', label: 'Tous les statuts' },
  { value: TournamentStatus.DRAFT, label: 'Brouillon' },
  { value: TournamentStatus.ACTIVE, label: 'Actif' },
  { value: TournamentStatus.FINISHED, label: 'Terminé' },
  { value: TournamentStatus.CANCELLED, label: 'Annulé' },
];

@Component({
  selector: 'app-super-admin-tournament-table',
  imports: [Button, ButtonIcon, CardCollapsible, DatePipe, Icon, InputSelect, InputText],
  templateUrl: './super-admin-tournament-table.html',
  styleUrl: './super-admin-tournament-table.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SuperAdminTournamentTableComponent {
  readonly list = input.required<SuperAdminTournamentsListState>();

  readonly searchRequested = output<SuperAdminTournamentSearchCriteria>();
  readonly detailRequested = output<string>();
  readonly passwordResetRequested = output<SuperAdminTournamentSummaryDto>();
  readonly deleteOneRequested = output<SuperAdminTournamentSummaryDto>();
  readonly deleteSelectionRequested = output<string[]>();
  readonly statusChangeRequested = output<string[]>();

  readonly statusFilterOptions = STATUS_FILTER_OPTIONS;
  readonly statusLabels = STATUS_LABELS;

  readonly selectedIds = signal<Set<string>>(new Set());
  readonly selectedCount = computed(() => this.selectedIds().size);
  readonly totalPages = computed(() =>
    computeTotalPages(this.list().total, this.list().criteria.pageSize),
  );

  // Drives the sort arrow on sortable headers.
  readonly sortState = computed(() => {
    const { sortBy, sortDir } = this.list().criteria;
    return computeSortState(sortBy, sortDir);
  });

  constructor() {
    // Keeps the selection limited to ids still present in the current list —
    // covers page/search/sort/filter changes and a row being deleted individually
    // in one place, instead of clearing selectedIds by hand in every action.
    effect(() => {
      const currentIds = this.list().items.map((item) => item.id);
      this.selectedIds.update((selected) => pruneSelection(selected, currentIds));
    });
  }

  onSearchInput(value: string): void {
    this.searchRequested.emit({ ...this.list().criteria, page: 1, search: value.trim() });
  }

  onStatusFilterChange(value: string): void {
    this.searchRequested.emit({
      ...this.list().criteria,
      page: 1,
      status: (value as TournamentStatus) || null,
    });
  }

  onSort(column: SuperAdminTournamentSortBy): void {
    const { sortBy, sortDir } = this.list().criteria;
    this.searchRequested.emit({
      ...this.list().criteria,
      sortBy: column,
      sortDir: nextSortDirection(sortBy, sortDir, column),
    });
  }

  onPageChange(page: number): void {
    this.searchRequested.emit({ ...this.list().criteria, page });
  }

  toggleSelectAll(checked: boolean): void {
    this.selectedIds.set(
      selectAll(
        this.list().items.map((item) => item.id),
        checked,
      ),
    );
  }

  toggleSelect(id: string, checked: boolean): void {
    this.selectedIds.update((selected) => toggleSelection(selected, id, checked));
  }

  openDetail(tournament: SuperAdminTournamentSummaryDto): void {
    this.detailRequested.emit(tournament.id);
  }

  openPasswordReset(tournament: SuperAdminTournamentSummaryDto): void {
    this.passwordResetRequested.emit(tournament);
  }

  deleteOne(tournament: SuperAdminTournamentSummaryDto): void {
    this.deleteOneRequested.emit(tournament);
  }

  deleteSelection(): void {
    this.deleteSelectionRequested.emit(Array.from(this.selectedIds()));
  }

  changeSelectionStatus(): void {
    this.statusChangeRequested.emit(Array.from(this.selectedIds()));
  }
}
