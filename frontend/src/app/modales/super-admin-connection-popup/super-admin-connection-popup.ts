import { DialogRef } from '@angular/cdk/dialog';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { Store } from '@ngrx/store';
import {
  clearSuperAdminSession,
  connectSuperAdmin,
} from 'src/app/store/superadmin/superadmin.actions';
import {
  selectSuperAdminError,
  selectSuperAdminIsLoading,
  selectSuperAdminPassword,
} from 'src/app/store/superadmin/superadmin.selectors';
import { Button } from '../../shared/button/button';
import { InputText } from '../../shared/input-text/input-text';
import { Icon } from 'src/app/shared/icon/icon';

@Component({
  selector: 'app-super-admin-connection-popup',
  imports: [Button, InputText, Icon],
  templateUrl: './super-admin-connection-popup.html',
  styleUrl: './super-admin-connection-popup.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SuperAdminConnectionPopupComponent {
  private readonly store = inject(Store);
  private readonly dialogRef = inject(DialogRef<boolean>);

  readonly password = signal('');
  readonly canConnect = computed(() => this.password().trim().length > 0);

  readonly authPassword = this.store.selectSignal(selectSuperAdminPassword);
  readonly isLoading = this.store.selectSignal(selectSuperAdminIsLoading);
  readonly error = this.store.selectSignal(selectSuperAdminError);

  constructor() {
    this.store.dispatch(clearSuperAdminSession());

    effect(() => {
      if (this.authPassword() !== null) {
        this.dialogRef.close(true);
      }
    });
  }

  onPasswordChange(value: string): void {
    this.password.set(value);
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onConnect(): void {
    if (this.canConnect()) {
      this.store.dispatch(connectSuperAdmin({ password: this.password().trim() }));
    }
  }
}
