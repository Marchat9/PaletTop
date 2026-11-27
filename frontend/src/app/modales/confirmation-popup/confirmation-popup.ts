import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Button } from '../../shared/button/button';
import { Icon } from 'src/app/shared/icon/icon';
import { InfoTile } from 'src/app/shared/info-tile/info-tile';
import { InlineNotice } from 'src/app/shared/inline-notice/inline-notice';
import { InputCheckbox } from 'src/app/shared/input-checkbox/input-checkbox';

/** A piece of context shown as an info tile under the message. */
export interface ConfirmationInfo {
  icon: string;
  label: string;
  value: string;
}

export interface ConfirmationData {
  title: string;
  message: string;
  icon?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  info?: ConfirmationInfo;
  /** Something to check before confirming, framed under the message. */
  notice?: string;
  /** Shows a "don't ask again" checkbox at the bottom left. */
  dontAskAgainLabel?: string;
  /** Called on confirmation only, when the "don't ask again" box is ticked. */
  onDontAskAgain?: () => void;
}

@Component({
  selector: 'app-confirmation-popup',
  standalone: true,
  imports: [Button, Icon, InfoTile, InlineNotice, InputCheckbox],
  templateUrl: './confirmation-popup.html',
  styleUrl: './confirmation-popup.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfirmationPopupComponent {
  readonly dialogRef = inject(DialogRef<boolean>);
  readonly data = inject<ConfirmationData>(DIALOG_DATA);
  readonly dontAskAgain = signal(false);

  onConfirm(): void {
    if (this.dontAskAgain()) {
      this.data.onDontAskAgain?.();
    }
    this.dialogRef.close(true);
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }
}
