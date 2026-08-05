import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Icon } from 'src/app/shared/icon/icon';

export type TeamAction = 'edit' | 'delete';

export interface TeamActionsMenuData {
  teamName: string;
}

@Component({
  selector: 'app-team-actions-menu',
  imports: [Icon],
  templateUrl: './team-actions-menu.html',
  styleUrl: './team-actions-menu.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TeamActionsMenu {
  public readonly dialogRef = inject(DialogRef<TeamAction | undefined>);
  public readonly data = inject<TeamActionsMenuData>(DIALOG_DATA);

  public select(action: TeamAction): void {
    this.dialogRef.close(action);
  }
}
