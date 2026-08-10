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
import { ConfirmationPopupComponent } from 'src/app/modales/confirmation-popup/confirmation-popup';
import { SuperAdminClubRenamePopupComponent } from 'src/app/modales/super-admin-club-rename-popup/super-admin-club-rename-popup';
import { SuperAdminClubSummaryDto } from 'src/app/services/super-admin-club.service';
import { CardCollapsible } from 'src/app/shared/card-collapsible/card-collapsible';
import { Icon } from 'src/app/shared/icon/icon';
import { InputText } from 'src/app/shared/input-text/input-text';
import {
  deleteSuperAdminClubs,
  searchSuperAdminClubs,
} from 'src/app/store/superadmin-clubs/superadmin-clubs.actions';
import { selectSuperAdminClubsList } from 'src/app/store/superadmin-clubs/superadmin-clubs.selectors';

@Component({
  selector: 'app-super-admin-club-table',
  imports: [CardCollapsible, Icon, InputText],
  templateUrl: './super-admin-club-table.html',
  styleUrl: './super-admin-club-table.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SuperAdminClubTableComponent implements OnInit {
  private readonly store = inject(Store);
  private readonly dialog = inject(Dialog);

  readonly list = this.store.selectSignal(selectSuperAdminClubsList);

  readonly searchTerm = signal('');
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

  openRename(club: SuperAdminClubSummaryDto): void {
    this.dialog.open(SuperAdminClubRenamePopupComponent, {
      data: { id: club.id, name: club.name },
      panelClass: 'dialog-panel',
      backdropClass: 'dialog-backdrop-light',
    });
  }

  deleteOne(club: SuperAdminClubSummaryDto): void {
    const message =
      club.playersCount > 0
        ? `Supprimer "${club.name}" ? ${club.playersCount} joueur(s) actuellement rattachés seront dissociés du club (pas supprimés).`
        : `Supprimer "${club.name}" ? Aucun joueur n'y est rattaché.`;

    this.dialog
      .open<boolean>(ConfirmationPopupComponent, {
        data: { title: 'Supprimer le club', message, confirmLabel: 'Supprimer' },
        panelClass: 'dialog-panel',
        backdropClass: 'dialog-backdrop-light',
      })
      .closed.pipe(first())
      .subscribe((confirmed) => {
        if (confirmed) {
          this.store.dispatch(deleteSuperAdminClubs({ ids: [club.id] }));
        }
      });
  }

  deleteSelection(): void {
    const ids = Array.from(this.selectedIds());

    this.dialog
      .open<boolean>(ConfirmationPopupComponent, {
        data: {
          title: 'Supprimer la sélection',
          message: `Supprimer les ${ids.length} clubs sélectionnés ? Les joueurs rattachés seront dissociés, pas supprimés.`,
          confirmLabel: 'Supprimer',
        },
        panelClass: 'dialog-panel',
        backdropClass: 'dialog-backdrop-light',
      })
      .closed.pipe(first())
      .subscribe((confirmed) => {
        if (confirmed) {
          this.store.dispatch(deleteSuperAdminClubs({ ids }));
          this.selectedIds.set(new Set());
        }
      });
  }

  private dispatchSearch(page: number): void {
    this.store.dispatch(
      searchSuperAdminClubs({
        criteria: { ...this.list().criteria, page, search: this.searchTerm().trim() },
      }),
    );
  }
}
