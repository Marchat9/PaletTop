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
import { resetSuperAdminTrainingPassword } from 'src/app/store/superadmin-trainings/superadmin-trainings.actions';
import { selectSuperAdminTrainingPasswordResetRequest } from 'src/app/store/superadmin-trainings/superadmin-trainings.selectors';
import { Button } from '../../shared/button/button';
import { InputText } from '../../shared/input-text/input-text';
import { Icon } from 'src/app/shared/icon/icon';

export type SuperAdminPasswordResetKind = 'tournament' | 'training';

export interface SuperAdminPasswordResetData {
  kind: SuperAdminPasswordResetKind;
  id: string;
  code: string;
  name: string;
}

const KIND_CONFIG = {
  tournament: {
    label: 'Tournoi',
    selector: selectSuperAdminTournamentPasswordResetRequest,
    action: resetSuperAdminTournamentPassword,
  },
  training: {
    label: 'Entraînement',
    selector: selectSuperAdminTrainingPasswordResetRequest,
    action: resetSuperAdminTrainingPassword,
  },
} as const;

@Component({
  selector: 'app-super-admin-password-reset-popup',
  imports: [Button, InputText, Icon],
  templateUrl: './super-admin-password-reset-popup.html',
  styleUrl: './super-admin-password-reset-popup.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SuperAdminPasswordResetPopupComponent {
  private readonly store = inject(Store);
  readonly dialogRef = inject(DialogRef<boolean>);
  readonly data = inject<SuperAdminPasswordResetData>(DIALOG_DATA);

  private readonly config = KIND_CONFIG[this.data.kind];
  readonly kindLabel = this.config.label;

  readonly newPassword = signal('');
  readonly canConfirm = computed(() => this.newPassword().trim().length > 0);

  readonly request = this.store.selectSignal(this.config.selector);

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
      this.config.action({
        id: this.data.id,
        newPassword: this.newPassword().trim(),
      }),
    );
  }
}
