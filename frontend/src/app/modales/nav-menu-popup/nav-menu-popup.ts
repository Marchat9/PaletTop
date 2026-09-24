import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Icon } from 'src/app/shared/icon/icon';
import { NavItemChild } from 'src/app/pages/navigation/nav-item.entity';

export interface NavMenuPopupData {
  title: string;
  items: NavItemChild[];
}

/**
 * Sous-destinations d'une entrée de navigation. Même composant dans les deux formats :
 * feuille remontant du bas sur mobile, menu ancré sous le lien sur desktop — seule la
 * stratégie de positionnement change à l'ouverture.
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
