import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Icon } from 'src/app/shared/icon/icon';
import { SwipeToDismissDirective } from 'src/app/shared/swipe-to-dismiss/swipe-to-dismiss.directive';

export type TeamAction = 'edit' | 'delete';

export interface TeamActionsMenuData {
  teamName: string;
  /** Opened as a bottom sheet (mobile): it can then be swiped down. */
  isSheet?: boolean;
}

@Component({
  selector: 'app-team-actions-menu',
  imports: [Icon, SwipeToDismissDirective],
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
