import { Dialog } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, inject, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { first } from 'rxjs';
import { ConfirmationPopupComponent } from 'src/app/modales/confirmation-popup/confirmation-popup';
import { SuperAdminClubRenamePopupComponent } from 'src/app/modales/super-admin-club-rename-popup/super-admin-club-rename-popup';
import { SuperAdminTournamentDeletePopupComponent } from 'src/app/modales/super-admin-tournament-delete-popup/super-admin-tournament-delete-popup';
import { SuperAdminTournamentDetailPopupComponent } from 'src/app/modales/super-admin-tournament-detail-popup/super-admin-tournament-detail-popup';
import { SuperAdminTournamentPasswordResetPopupComponent } from 'src/app/modales/super-admin-tournament-password-reset-popup/super-admin-tournament-password-reset-popup';
import { SuperAdminTournamentStatusPopupComponent } from 'src/app/modales/super-admin-tournament-status-popup/super-admin-tournament-status-popup';
import { TournamentStatus } from 'src/app/models/tournament-status.enum';
import { SuperAdminClubSummaryDto } from 'src/app/services/super-admin-club.service';
import { SuperAdminTournamentSummaryDto } from 'src/app/services/super-admin-tournament.service';
import { Button } from 'src/app/shared/button/button';
import { MetricTileComponent } from 'src/app/shared/metric-tile/metric-tile';
import { loadMetrics } from 'src/app/store/metrics/metrics.actions';
import { selectMetrics } from 'src/app/store/metrics/metrics.selectors';
import {
  deleteSuperAdminClubs,
  searchSuperAdminClubs,
  SuperAdminClubSearchCriteria,
} from 'src/app/store/superadmin-clubs/superadmin-clubs.actions';
import { selectSuperAdminClubsList } from 'src/app/store/superadmin-clubs/superadmin-clubs.selectors';
import {
  deleteSuperAdminTournaments,
  searchSuperAdminTournaments,
  SuperAdminTournamentSearchCriteria,
} from 'src/app/store/superadmin-tournaments/superadmin-tournaments.actions';
import { selectSuperAdminTournamentsList } from 'src/app/store/superadmin-tournaments/superadmin-tournaments.selectors';
import { clearSuperAdminSession } from 'src/app/store/superadmin/superadmin.actions';
import { selectSuperAdminPassword } from 'src/app/store/superadmin/superadmin.selectors';
import { SuperAdminClubTableComponent } from './components/super-admin-club-table/super-admin-club-table';
import { SuperAdminSettingsComponent } from './components/super-admin-settings/super-admin-settings';
import { SuperAdminTournamentTableComponent } from './components/super-admin-tournament-table/super-admin-tournament-table';

const DIALOG_OPTIONS = {
  panelClass: 'dialog-panel',
  backdropClass: 'dialog-backdrop-light',
} as const;

@Component({
  selector: 'app-super-admin-page',
  imports: [
    Button,
    MetricTileComponent,
    SuperAdminClubTableComponent,
    SuperAdminSettingsComponent,
    SuperAdminTournamentTableComponent,
  ],
  templateUrl: './super-admin-page.html',
  styleUrl: './super-admin-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SuperAdminPageComponent implements OnInit, OnDestroy {
  private readonly store = inject(Store);
  private readonly dialog = inject(Dialog);
  private readonly router = inject(Router);

  public readonly metrics = this.store.selectSignal(selectMetrics);
  public readonly tournaments = this.store.selectSignal(selectSuperAdminTournamentsList);
  public readonly clubs = this.store.selectSignal(selectSuperAdminClubsList);

  // Template references TournamentStatus.ACTIVE/.DRAFT/.FINISHED directly (not
  // string literals like 'ACTIVE') — TypeScript string enums are nominal types,
  // so a bare string literal isn't assignable to a TournamentStatus-typed
  // parameter even when the runtime value matches.
  readonly TournamentStatus = TournamentStatus;

  constructor() {
    if (this.store.selectSignal(selectSuperAdminPassword)() === null) {
      this.router.navigate(['/']);
    }
  }

  ngOnInit(): void {
    this.refresh();
  }

  ngOnDestroy(): void {
    this.store.dispatch(clearSuperAdminSession());
  }

  refresh(): void {
    this.store.dispatch(loadMetrics());
    this.store.dispatch(searchSuperAdminTournaments({ criteria: this.tournaments().criteria }));
    this.store.dispatch(searchSuperAdminClubs({ criteria: this.clubs().criteria }));
  }

  onStatTileClick(status: TournamentStatus): void {
    this.store.dispatch(
      searchSuperAdminTournaments({
        criteria: { ...this.tournaments().criteria, status, page: 1 },
      }),
    );
  }

  onTournamentSearch(criteria: SuperAdminTournamentSearchCriteria): void {
    this.store.dispatch(searchSuperAdminTournaments({ criteria }));
  }

  onTournamentDetailRequested(id: string): void {
    this.dialog.open(SuperAdminTournamentDetailPopupComponent, { data: { id }, ...DIALOG_OPTIONS });
  }

  onTournamentPasswordResetRequested(tournament: SuperAdminTournamentSummaryDto): void {
    this.dialog.open(SuperAdminTournamentPasswordResetPopupComponent, {
      data: { id: tournament.id, code: tournament.code, name: tournament.name },
      ...DIALOG_OPTIONS,
    });
  }

  onTournamentDeleteOneRequested(tournament: SuperAdminTournamentSummaryDto): void {
    if (tournament.status === TournamentStatus.ACTIVE) {
      this.dialog.open(SuperAdminTournamentDeletePopupComponent, {
        data: { id: tournament.id, code: tournament.code, name: tournament.name },
        ...DIALOG_OPTIONS,
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
        ...DIALOG_OPTIONS,
      })
      .closed.pipe(first())
      .subscribe((confirmed) => {
        if (confirmed) {
          this.store.dispatch(deleteSuperAdminTournaments({ ids: [tournament.id] }));
        }
      });
  }

  onTournamentDeleteSelectionRequested(ids: string[]): void {
    const hasActive = this.tournaments().items.some(
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
        ...DIALOG_OPTIONS,
      })
      .closed.pipe(first())
      .subscribe((confirmed) => {
        if (confirmed) {
          this.store.dispatch(deleteSuperAdminTournaments({ ids }));
        }
      });
  }

  onTournamentStatusChangeRequested(ids: string[]): void {
    this.dialog.open<boolean>(SuperAdminTournamentStatusPopupComponent, {
      data: { ids },
      ...DIALOG_OPTIONS,
    });
  }

  onClubSearch(criteria: SuperAdminClubSearchCriteria): void {
    this.store.dispatch(searchSuperAdminClubs({ criteria }));
  }

  onClubRenameRequested(club: SuperAdminClubSummaryDto): void {
    this.dialog.open(SuperAdminClubRenamePopupComponent, {
      data: { id: club.id, name: club.name },
      ...DIALOG_OPTIONS,
    });
  }

  onClubDeleteOneRequested(club: SuperAdminClubSummaryDto): void {
    const message =
      club.playersCount > 0
        ? `Supprimer "${club.name}" ? ${club.playersCount} joueur(s) actuellement rattachés seront dissociés du club (pas supprimés).`
        : `Supprimer "${club.name}" ? Aucun joueur n'y est rattaché.`;

    this.dialog
      .open<boolean>(ConfirmationPopupComponent, {
        data: { title: 'Supprimer le club', message, confirmLabel: 'Supprimer' },
        ...DIALOG_OPTIONS,
      })
      .closed.pipe(first())
      .subscribe((confirmed) => {
        if (confirmed) {
          this.store.dispatch(deleteSuperAdminClubs({ ids: [club.id] }));
        }
      });
  }

  onClubDeleteSelectionRequested(ids: string[]): void {
    this.dialog
      .open<boolean>(ConfirmationPopupComponent, {
        data: {
          title: 'Supprimer la sélection',
          message: `Supprimer les ${ids.length} clubs sélectionnés ? Les joueurs rattachés seront dissociés, pas supprimés.`,
          confirmLabel: 'Supprimer',
        },
        ...DIALOG_OPTIONS,
      })
      .closed.pipe(first())
      .subscribe((confirmed) => {
        if (confirmed) {
          this.store.dispatch(deleteSuperAdminClubs({ ids }));
        }
      });
  }
}
