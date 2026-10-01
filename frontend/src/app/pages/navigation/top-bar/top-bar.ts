import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NavItem } from '../nav-item.entity';
import { NavItemSelection } from '../bottom-nav/bottom-nav';
import { ThemeMode } from 'src/app/models/theme-mode.model';
import { ButtonIcon } from 'src/app/shared/button-icon/button-icon';
import { Icon } from 'src/app/shared/icon/icon';
import { BurgerMenu } from '../../../shared/burger-menu/burger-menu';
import { BurgerMenuClickKey, BurgerMenuItem } from 'src/app/shared/burger-menu/burger-menu.model';
import { NgOptimizedImage } from '@angular/common';

@Component({
  selector: 'app-top-bar',
  imports: [RouterLink, ButtonIcon, Icon, BurgerMenu, NgOptimizedImage],
  templateUrl: './top-bar.html',
  styleUrl: './top-bar.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TopBarComponent {
  // Input
  readonly title = input.required<string>();
  readonly links = input<NavItem[]>([]);
  readonly activeKey = input<string | null>(null);
  readonly showLinks = input<boolean>(true);
  readonly theme = input.required<ThemeMode>();
  readonly notificationBadge = input<number | null>(null);
  readonly burgerMenuItem = input<BurgerMenuItem[]>([]);

  // Output
  public readonly changeTheme = output<ThemeMode>();
  public readonly notificationClick = output<void>();
  public readonly burgerMenuClick = output<BurgerMenuClickKey>();
  /** Entry with sub-destinations: opening the menu is the container's business. */
  public readonly itemSelected = output<NavItemSelection>();

  // Function
  public toggleTheme(): void {
    const nextTheme = this.theme() === 'dark' ? 'light' : 'dark';
    this.changeTheme.emit(nextTheme);
  }
}
