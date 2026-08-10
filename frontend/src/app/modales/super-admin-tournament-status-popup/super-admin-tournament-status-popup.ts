import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { Store } from '@ngrx/store';
import { TournamentStatus } from 'src/app/models/tournament-status.enum';
import { changeSuperAdminTournamentsStatus } from 'src/app/store/superadmin-tournaments/superadmin-tournaments.actions';
import { selectSuperAdminTournamentStatusChangeRequest } from 'src/app/store/superadmin-tournaments/superadmin-tournaments.selectors';
import { Button } from '../../shared/button/button';
import { Icon } from 'src/app/shared/icon/icon';

export interface SuperAdminTournamentStatusData {
  ids: string[];
}

interface StatusOption {
  value: TournamentStatus;
  label: string;
}

const STATUS_OPTIONS: StatusOption[] = [
  { value: TournamentStatus.DRAFT, label: 'Brouillon' },
  { value: TournamentStatus.ACTIVE, label: 'Actif' },
  { value: TournamentStatus.FINISHED, label: 'Terminé' },
  { value: TournamentStatus.CANCELLED, label: 'Annulé' },
];

@Component({
  selector: 'app-super-admin-tournament-status-popup',
  imports: [Button, Icon],
  templateUrl: './super-admin-tournament-status-popup.html',
  styleUrl: './super-admin-tournament-status-popup.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SuperAdminTournamentStatusPopupComponent {
  private readonly store = inject(Store);
  readonly dialogRef = inject(DialogRef<boolean>);
  readonly data = inject<SuperAdminTournamentStatusData>(DIALOG_DATA);

  readonly statusOptions = STATUS_OPTIONS;
  readonly selectedStatus = signal<TournamentStatus | null>(null);
  readonly canConfirm = computed(() => this.selectedStatus() !== null);

  readonly request = this.store.selectSignal(selectSuperAdminTournamentStatusChangeRequest);
  protected hasSubmitted = false;

  constructor() {
    effect(() => {
      const request = this.request();
      if (!request.isLoading && !request.error && this.hasSubmitted) {
        this.dialogRef.close(true);
      }
    });
  }

  onSelectStatus(status: TournamentStatus): void {
    this.selectedStatus.set(status);
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onConfirm(): void {
    const status = this.selectedStatus();
    if (!status) return;
    this.hasSubmitted = true;
    this.store.dispatch(changeSuperAdminTournamentsStatus({ ids: this.data.ids, status }));
  }
}
