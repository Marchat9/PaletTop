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
import { deleteSuperAdminTournaments } from 'src/app/store/superadmin-tournaments/superadmin-tournaments.actions';
import { selectSuperAdminTournamentDeleteRequest } from 'src/app/store/superadmin-tournaments/superadmin-tournaments.selectors';
import { Button } from '../../shared/button/button';
import { InputText } from '../../shared/input-text/input-text';
import { Icon } from 'src/app/shared/icon/icon';

export interface SuperAdminTournamentReinforcedDeleteData {
  id: string;
  code: string;
  name: string;
}

@Component({
  selector: 'app-super-admin-tournament-delete-popup',
  imports: [Button, InputText, Icon],
  templateUrl: './super-admin-tournament-delete-popup.html',
  styleUrl: './super-admin-tournament-delete-popup.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SuperAdminTournamentDeletePopupComponent {
  private readonly store = inject(Store);
  readonly dialogRef = inject(DialogRef<boolean>);
  readonly data = inject<SuperAdminTournamentReinforcedDeleteData>(DIALOG_DATA);

  readonly confirmInput = signal('');
  readonly canConfirm = computed(() => this.confirmInput().trim() === this.data.code);

  readonly request = this.store.selectSignal(selectSuperAdminTournamentDeleteRequest);
  protected hasSubmitted = false;

  constructor() {
    effect(() => {
      const request = this.request();
      if (!request.isLoading && !request.error && this.hasSubmitted) {
        this.dialogRef.close(true);
      }
    });
  }

  onInputChange(value: string): void {
    this.confirmInput.set(value);
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onConfirm(): void {
    if (!this.canConfirm()) return;
    this.hasSubmitted = true;
    this.store.dispatch(deleteSuperAdminTournaments({ ids: [this.data.id] }));
  }
}
