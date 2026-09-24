import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NavItem } from '../nav-item.entity';
import { Icon } from '../../../shared/icon/icon';

export interface NavItemSelection {
  item: NavItem;
  anchor: HTMLElement;
}

@Component({
  selector: 'app-bottom-nav',
  imports: [RouterLink, Icon],
  templateUrl: './bottom-nav.html',
  styleUrl: './bottom-nav.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BottomNavComponent {
  readonly items = input<NavItem[]>([]);
  readonly activeKey = input<string | null>(null);
  readonly visible = input<boolean>(true);

  /** Entrée à sous-destinations : l'ouverture du menu est l'affaire du conteneur. */
  readonly itemSelected = output<NavItemSelection>();
}
