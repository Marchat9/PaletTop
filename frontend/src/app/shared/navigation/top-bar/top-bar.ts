import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NavItem } from '../nav-item.entity';
import { ThemeMode } from 'src/app/models/theme-mode.model';
import { ButtonIcon } from 'src/app/shared/button-icon/button-icon';
import { Icon } from 'src/app/shared/icon/icon';
import { NgOptimizedImage } from '@angular/common';

@Component({
  selector: 'app-top-bar',
  imports: [RouterLink, ButtonIcon, Icon, NgOptimizedImage],
  templateUrl: './top-bar.html',
  styleUrl: './top-bar.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TopBarComponent {
  readonly title = input.required<string>();
  readonly links = input<NavItem[]>([]);
  readonly activeRoute = input<string>('');
  readonly showLinks = input<boolean>(true);
  readonly theme = input.required<ThemeMode>();
  readonly notificationBadge = input<number | null>(null);

  public readonly changeTheme = output<ThemeMode>();
  public readonly notificationClick = output<void>();

  public toggleTheme(): void {
    const nextTheme = this.theme() === 'dark' ? 'light' : 'dark';
    this.changeTheme.emit(nextTheme);
  }
}
