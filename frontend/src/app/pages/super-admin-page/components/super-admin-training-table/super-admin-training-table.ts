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
import { SuperAdminTrainingSummaryDto } from 'src/app/services/super-admin-training.service';
import { Button } from 'src/app/shared/button/button';
import { ButtonIcon } from 'src/app/shared/button-icon/button-icon';
import { CardCollapsible } from 'src/app/shared/card-collapsible/card-collapsible';
import { Icon } from 'src/app/shared/icon/icon';
import { InputText } from 'src/app/shared/input-text/input-text';
import {
  SuperAdminTrainingSearchCriteria,
  SuperAdminTrainingSortBy,
} from 'src/app/store/superadmin-trainings/superadmin-trainings.actions';
import { SuperAdminTrainingsListState } from 'src/app/store/superadmin-trainings/superadmin-trainings.reducer';
import {
  computeSortState,
  computeTotalPages,
  nextSortDirection,
  pruneSelection,
  selectAll,
  toggleSelection,
} from '../super-admin-table.utils';

@Component({
  selector: 'app-super-admin-training-table',
  imports: [Button, ButtonIcon, CardCollapsible, DatePipe, Icon, InputText],
  templateUrl: './super-admin-training-table.html',
  styleUrl: './super-admin-training-table.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SuperAdminTrainingTableComponent {
  readonly list = input.required<SuperAdminTrainingsListState>();

  readonly searchRequested = output<SuperAdminTrainingSearchCriteria>();
  readonly detailRequested = output<string>();
  readonly passwordResetRequested = output<SuperAdminTrainingSummaryDto>();
  readonly deleteOneRequested = output<SuperAdminTrainingSummaryDto>();
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
    // Keeps the selection limited to ids still present in the current list.
    effect(() => {
      const currentIds = this.list().items.map((item) => item.id);
      this.selectedIds.update((selected) => pruneSelection(selected, currentIds));
    });
  }

  onSearchInput(value: string): void {
    this.searchRequested.emit({ ...this.list().criteria, page: 1, search: value.trim() });
  }

  onSort(column: SuperAdminTrainingSortBy): void {
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

  openDetail(training: SuperAdminTrainingSummaryDto): void {
    this.detailRequested.emit(training.id);
  }

  openPasswordReset(training: SuperAdminTrainingSummaryDto): void {
    this.passwordResetRequested.emit(training);
  }

  deleteOne(training: SuperAdminTrainingSummaryDto): void {
    this.deleteOneRequested.emit(training);
  }

  deleteSelection(): void {
    this.deleteSelectionRequested.emit(Array.from(this.selectedIds()));
  }
}
