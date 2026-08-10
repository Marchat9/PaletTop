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
import { resetSuperAdminTournamentPassword } from 'src/app/store/superadmin-tournaments/superadmin-tournaments.actions';
import { selectSuperAdminTournamentPasswordResetRequest } from 'src/app/store/superadmin-tournaments/superadmin-tournaments.selectors';
import { Button } from '../../shared/button/button';
import { InputText } from '../../shared/input-text/input-text';
import { Icon } from 'src/app/shared/icon/icon';

export interface SuperAdminTournamentPasswordResetData {
  id: string;
  code: string;
  name: string;
}

@Component({
  selector: 'app-super-admin-tournament-password-reset-popup',
  imports: [Button, InputText, Icon],
  templateUrl: './super-admin-tournament-password-reset-popup.html',
  styleUrl: './super-admin-tournament-password-reset-popup.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SuperAdminTournamentPasswordResetPopupComponent {
  private readonly store = inject(Store);
  readonly dialogRef = inject(DialogRef<boolean>);
  readonly data = inject<SuperAdminTournamentPasswordResetData>(DIALOG_DATA);

  readonly newPassword = signal('');
  readonly canConfirm = computed(() => this.newPassword().trim().length > 0);

  readonly request = this.store.selectSignal(selectSuperAdminTournamentPasswordResetRequest);

  constructor() {
    effect(() => {
      const request = this.request();
      if (
        !request.isLoading &&
        !request.error &&
        this.newPassword().length > 0 &&
        this.hasSubmitted
      ) {
        this.dialogRef.close(true);
      }
    });
  }

  protected hasSubmitted = false;

  onPasswordChange(value: string): void {
    this.newPassword.set(value);
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onConfirm(): void {
    if (!this.canConfirm()) return;
    this.hasSubmitted = true;
    this.store.dispatch(
      resetSuperAdminTournamentPassword({
        id: this.data.id,
        newPassword: this.newPassword().trim(),
      }),
    );
  }
}
