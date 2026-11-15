import { DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Button } from 'src/app/shared/button/button';
import { Icon } from 'src/app/shared/icon/icon';

/** The backend did not answer; closes with `true` when the user asks to try again. */
@Component({
  selector: 'app-server-unreachable-popup',
  imports: [Button, Icon],
  templateUrl: './server-unreachable-popup.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ServerUnreachablePopupComponent {
  private readonly dialogRef = inject<DialogRef<boolean>>(DialogRef);

  public retry(): void {
    this.dialogRef.close(true);
  }

  public close(): void {
    this.dialogRef.close(false);
  }
}
