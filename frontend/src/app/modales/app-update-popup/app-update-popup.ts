import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Nullable } from 'src/app/models/nullable.model';
import { Button } from 'src/app/shared/button/button';
import { Icon } from 'src/app/shared/icon/icon';

export interface AppUpdatePopupData {
  currentVersion: string;
  /** Deployed release, when the backend gave it (a service worker update does not). */
  latestVersion: Nullable<string>;
}

/** Tells a stale app a new release is out; closes with `true` when the user asks to refresh. */
@Component({
  selector: 'app-app-update-popup',
  imports: [Button, Icon],
  templateUrl: './app-update-popup.html',
  styleUrl: './app-update-popup.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppUpdatePopupComponent {
  private readonly dialogRef = inject<DialogRef<boolean>>(DialogRef);
  public readonly data = inject<AppUpdatePopupData>(DIALOG_DATA);

  public refresh(): void {
    this.dialogRef.close();
  }

  public close(): void {
    this.dialogRef.close();
  }
}
