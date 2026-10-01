import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Icon } from 'src/app/shared/icon/icon';
import { NavItemChild } from 'src/app/pages/navigation/nav-item.entity';

export interface NavMenuPopupData {
  title: string;
  items: NavItemChild[];
}

/**
 * Sub-destinations of a navigation entry. Same component in both formats: sheet coming up from the
 * bottom on mobile, menu anchored under the link on desktop - only the positioning strategy changes
 * when opening.
 */
@Component({
  selector: 'app-nav-menu-popup',
  imports: [Icon],
  templateUrl: './nav-menu-popup.html',
  styleUrl: './nav-menu-popup.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NavMenuPopup {
  private readonly dialogRef = inject(DialogRef<string | undefined>);
  public readonly data = inject<NavMenuPopupData>(DIALOG_DATA);

  public select(route: string): void {
    this.dialogRef.close(route);
  }
}
