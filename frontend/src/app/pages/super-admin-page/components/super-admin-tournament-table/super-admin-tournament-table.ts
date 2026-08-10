import { DatePipe } from '@angular/common';
import { Dialog } from '@angular/cdk/dialog';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { Store } from '@ngrx/store';
import { first } from 'rxjs';
import { TournamentStatus } from 'src/app/models/tournament-status.enum';
import { ConfirmationPopupComponent } from 'src/app/modales/confirmation-popup/confirmation-popup';
import { SuperAdminTournamentDeletePopupComponent } from 'src/app/modales/super-admin-tournament-delete-popup/super-admin-tournament-delete-popup';
import { SuperAdminTournamentDetailPopupComponent } from 'src/app/modales/super-admin-tournament-detail-popup/super-admin-tournament-detail-popup';
import { SuperAdminTournamentPasswordResetPopupComponent } from 'src/app/modales/super-admin-tournament-password-reset-popup/super-admin-tournament-password-reset-popup';
import { SuperAdminTournamentStatusPopupComponent } from 'src/app/modales/super-admin-tournament-status-popup/super-admin-tournament-status-popup';
import { SuperAdminTournamentSummaryDto } from 'src/app/services/super-admin-tournament.service';
import { CardCollapsible } from 'src/app/shared/card-collapsible/card-collapsible';
import { Icon } from 'src/app/shared/icon/icon';
import { InputSelect, InputSelectOption } from 'src/app/shared/input-select/input-select';
import { InputText } from 'src/app/shared/input-text/input-text';
import {
  deleteSuperAdminTournaments,
  searchSuperAdminTournaments,
} from 'src/app/store/superadmin-tournaments/superadmin-tournaments.actions';
import { selectSuperAdminTournamentsList } from 'src/app/store/superadmin-tournaments/superadmin-tournaments.selectors';

type SortableColumn = 'name' | 'status' | 'date' | 'createdAt';

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
  imports: [CardCollapsible, DatePipe, Icon, InputSelect, InputText],
  templateUrl: './super-admin-tournament-table.html',
  styleUrl: './super-admin-tournament-table.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SuperAdminTournamentTableComponent implements OnInit {
  private readonly store = inject(Store);
  private readonly dialog = inject(Dialog);

  readonly list = this.store.selectSignal(selectSuperAdminTournamentsList);
  readonly statusFilterOptions = STATUS_FILTER_OPTIONS;
  readonly statusLabels = STATUS_LABELS;

  readonly searchTerm = signal('');
  readonly statusFilter = signal('');
  readonly selectedIds = signal<Set<string>>(new Set());

  readonly selectedCount = computed(() => this.selectedIds().size);
  readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.list().total / this.list().criteria.pageSize)),
  );

  ngOnInit(): void {
    this.dispatchSearch(1);
  }

  onSearchInput(value: string): void {
    this.searchTerm.set(value);
    this.selectedIds.set(new Set());
    this.dispatchSearch(1);
  }

  onStatusFilterChange(value: string): void {
    this.statusFilter.set(value);
    this.selectedIds.set(new Set());
    this.dispatchSearch(1);
  }

  // Called by the page component when a stat tile is clicked.
  applyStatusFilter(status: TournamentStatus): void {
    this.onStatusFilterChange(status);
  }

  onSort(column: SortableColumn): void {
    const { sortBy, sortDir } = this.list().criteria;
    const nextDir = sortBy === column && sortDir === 'ASC' ? 'DESC' : 'ASC';
    this.selectedIds.set(new Set());
    this.store.dispatch(
      searchSuperAdminTournaments({
        criteria: { ...this.list().criteria, sortBy: column, sortDir: nextDir },
      }),
    );
  }

  // Drives the visual sort arrow and the aria-sort attribute on sortable headers.
  sortIndicator(column: SortableColumn): '▲' | '▼' | null {
    const { sortBy, sortDir } = this.list().criteria;
    if (sortBy !== column) return null;
    return sortDir === 'ASC' ? '▲' : '▼';
  }

  ariaSortFor(column: SortableColumn): 'ascending' | 'descending' | null {
    const { sortBy, sortDir } = this.list().criteria;
    if (sortBy !== column) return null;
    return sortDir === 'ASC' ? 'ascending' : 'descending';
  }

  onPageChange(page: number): void {
    this.selectedIds.set(new Set());
    this.dispatchSearch(page);
  }

  toggleSelectAll(checked: boolean): void {
    this.selectedIds.set(checked ? new Set(this.list().items.map((item) => item.id)) : new Set());
  }

  toggleSelect(id: string, checked: boolean): void {
    const next = new Set(this.selectedIds());
    if (checked) next.add(id);
    else next.delete(id);
    this.selectedIds.set(next);
  }

  openDetail(tournament: SuperAdminTournamentSummaryDto): void {
    this.dialog.open(SuperAdminTournamentDetailPopupComponent, {
      data: { id: tournament.id },
      panelClass: 'dialog-panel',
      backdropClass: 'dialog-backdrop-light',
    });
  }

  openPasswordReset(tournament: SuperAdminTournamentSummaryDto): void {
    this.dialog.open(SuperAdminTournamentPasswordResetPopupComponent, {
      data: { id: tournament.id, code: tournament.code, name: tournament.name },
      panelClass: 'dialog-panel',
      backdropClass: 'dialog-backdrop-light',
    });
  }

  deleteOne(tournament: SuperAdminTournamentSummaryDto): void {
    if (tournament.status === TournamentStatus.ACTIVE) {
      this.dialog.open(SuperAdminTournamentDeletePopupComponent, {
        data: { id: tournament.id, code: tournament.code, name: tournament.name },
        panelClass: 'dialog-panel',
        backdropClass: 'dialog-backdrop-light',
      });
      return;
    }

    this.dialog
      .open<boolean>(ConfirmationPopupComponent, {
        data: {
          title: 'Supprimer le tournoi',
          message: `Supprimer "${tournament.name}" (${tournament.code}) ? Cette action est irréversible.`,
          confirmLabel: 'Supprimer',
        },
        panelClass: 'dialog-panel',
        backdropClass: 'dialog-backdrop-light',
      })
      .closed.pipe(first())
      .subscribe((confirmed) => {
        if (confirmed) {
          this.store.dispatch(deleteSuperAdminTournaments({ ids: [tournament.id] }));
        }
      });
  }

  deleteSelection(): void {
    const ids = Array.from(this.selectedIds());
    const hasActive = this.list().items.some(
      (item) => ids.includes(item.id) && item.status === TournamentStatus.ACTIVE,
    );

    this.dialog
      .open<boolean>(ConfirmationPopupComponent, {
        data: {
          title: 'Supprimer la sélection',
          message: hasActive
            ? `Supprimer les ${ids.length} tournois sélectionnés, dont au moins un tournoi actif ? Cette action est irréversible.`
            : `Supprimer les ${ids.length} tournois sélectionnés ? Cette action est irréversible.`,
          confirmLabel: 'Supprimer',
        },
        panelClass: 'dialog-panel',
        backdropClass: 'dialog-backdrop-light',
      })
      .closed.pipe(first())
      .subscribe((confirmed) => {
        if (confirmed) {
          this.store.dispatch(deleteSuperAdminTournaments({ ids }));
          this.selectedIds.set(new Set());
        }
      });
  }

  changeSelectionStatus(): void {
    this.dialog
      .open<boolean>(SuperAdminTournamentStatusPopupComponent, {
        data: { ids: Array.from(this.selectedIds()) },
        panelClass: 'dialog-panel',
        backdropClass: 'dialog-backdrop-light',
      })
      .closed.pipe(first())
      .subscribe((confirmed) => {
        if (confirmed) {
          this.selectedIds.set(new Set());
        }
      });
  }

  private dispatchSearch(page: number): void {
    this.store.dispatch(
      searchSuperAdminTournaments({
        criteria: {
          ...this.list().criteria,
          page,
          search: this.searchTerm().trim(),
          status: (this.statusFilter() as TournamentStatus) || null,
        },
      }),
    );
  }
}
