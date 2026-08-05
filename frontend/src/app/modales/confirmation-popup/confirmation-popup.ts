import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Button } from '../../shared/button/button';
import { Icon } from 'src/app/shared/icon/icon';

export interface ConfirmationData {
  title: string;
  message: string;
  icon?: string;
  confirmLabel?: string;
  cancelLabel?: string;
}

@Component({
  selector: 'app-confirmation-popup',
  standalone: true,
  imports: [Button, Icon],
  templateUrl: './confirmation-popup.html',
  styleUrl: './confirmation-popup.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfirmationPopupComponent {
  readonly dialogRef = inject(DialogRef<boolean>);
  readonly data = inject<ConfirmationData>(DIALOG_DATA);

  onConfirm(): void {
    this.dialogRef.close(true);
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }
}
