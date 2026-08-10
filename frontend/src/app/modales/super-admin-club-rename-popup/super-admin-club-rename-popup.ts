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
import { renameSuperAdminClub } from 'src/app/store/superadmin-clubs/superadmin-clubs.actions';
import { selectSuperAdminClubRenameRequest } from 'src/app/store/superadmin-clubs/superadmin-clubs.selectors';
import { Button } from '../../shared/button/button';
import { InputText } from '../../shared/input-text/input-text';
import { Icon } from 'src/app/shared/icon/icon';

export interface SuperAdminClubRenameData {
  id: string;
  name: string;
}

@Component({
  selector: 'app-super-admin-club-rename-popup',
  imports: [Button, InputText, Icon],
  templateUrl: './super-admin-club-rename-popup.html',
  styleUrl: './super-admin-club-rename-popup.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SuperAdminClubRenamePopupComponent {
  private readonly store = inject(Store);
  readonly dialogRef = inject(DialogRef<boolean>);
  readonly data = inject<SuperAdminClubRenameData>(DIALOG_DATA);

  readonly name = signal(this.data.name);
  readonly canConfirm = computed(
    () => this.name().trim().length > 0 && this.name().trim() !== this.data.name,
  );

  readonly request = this.store.selectSignal(selectSuperAdminClubRenameRequest);
  protected hasSubmitted = false;

  constructor() {
    effect(() => {
      const request = this.request();
      if (!request.isLoading && !request.error && this.hasSubmitted) {
        this.dialogRef.close(true);
      }
    });
  }

  onNameChange(value: string): void {
    this.name.set(value);
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onConfirm(): void {
    if (!this.canConfirm()) return;
    this.hasSubmitted = true;
    this.store.dispatch(renameSuperAdminClub({ id: this.data.id, name: this.name().trim() }));
  }
}
