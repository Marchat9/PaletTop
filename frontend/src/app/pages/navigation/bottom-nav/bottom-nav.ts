import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NavItem } from '../nav-item.entity';
import { Icon } from '../../../shared/icon/icon';

@Component({
  selector: 'app-bottom-nav',
  imports: [RouterLink, Icon],
  templateUrl: './bottom-nav.html',
  styleUrl: './bottom-nav.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BottomNavComponent {
  readonly items = input<NavItem[]>([]);
  readonly activeRoute = input<string>('');
  readonly visible = input<boolean>(true);
}
