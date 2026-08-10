import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  output,
  signal,
} from '@angular/core';
import { SuperAdminClubSummaryDto } from 'src/app/services/super-admin-club.service';
import { Button } from 'src/app/shared/button/button';
import { ButtonIcon } from 'src/app/shared/button-icon/button-icon';
import { CardCollapsible } from 'src/app/shared/card-collapsible/card-collapsible';
import { Icon } from 'src/app/shared/icon/icon';
import { InputText } from 'src/app/shared/input-text/input-text';
import { SuperAdminClubSearchCriteria } from 'src/app/store/superadmin-clubs/superadmin-clubs.actions';
import { SuperAdminClubsListState } from 'src/app/store/superadmin-clubs/superadmin-clubs.reducer';
import {
  computeSortState,
  computeTotalPages,
  nextSortDirection,
  pruneSelection,
  selectAll,
  toggleSelection,
} from '../super-admin-table.utils';

type SortableColumn = 'name' | 'playersCount';

@Component({
  selector: 'app-super-admin-club-table',
  imports: [Button, ButtonIcon, CardCollapsible, Icon, InputText],
  templateUrl: './super-admin-club-table.html',
  styleUrl: './super-admin-club-table.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SuperAdminClubTableComponent {
  readonly list = input.required<SuperAdminClubsListState>();

  readonly searchRequested = output<SuperAdminClubSearchCriteria>();
  readonly renameRequested = output<SuperAdminClubSummaryDto>();
  readonly deleteOneRequested = output<SuperAdminClubSummaryDto>();
  readonly deleteSelectionRequested = output<string[]>();

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
    // covers page/search/sort changes and a row being deleted individually
    // in one place, instead of clearing selectedIds by hand in every action.
    effect(() => {
      const currentIds = this.list().items.map((item) => item.id);
      this.selectedIds.update((selected) => pruneSelection(selected, currentIds));
    });
  }

  onSearchInput(value: string): void {
    this.searchRequested.emit({ ...this.list().criteria, page: 1, search: value.trim() });
  }

  onSort(column: SortableColumn): void {
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

  openRename(club: SuperAdminClubSummaryDto): void {
    this.renameRequested.emit(club);
  }

  deleteOne(club: SuperAdminClubSummaryDto): void {
    this.deleteOneRequested.emit(club);
  }

  deleteSelection(): void {
    this.deleteSelectionRequested.emit(Array.from(this.selectedIds()));
  }
}
