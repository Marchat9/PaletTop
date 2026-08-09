import { NgOptimizedImage } from '@angular/common';
import { Component, computed, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule, MenuPositionX, MenuPositionY } from '@angular/material/menu';
import { BurgerMenuClickKey, BurgerMenuItem } from 'src/app/shared/burger-menu/burger-menu.model';
import { Icon } from '../icon/icon';
import { ButtonIcon } from '../button-icon/button-icon';

@Component({
  selector: 'app-burger-menu',
  imports: [MatButtonModule, MatMenuModule, MatIconModule, Icon, NgOptimizedImage, ButtonIcon],
  templateUrl: './burger-menu.html',
  styleUrl: './burger-menu.scss',
})
export class BurgerMenu {
  readonly menuIcon = input<string>('more_vert');
  readonly xPosition = input<MenuPositionX>('before');
  readonly yPosition = input<MenuPositionY>('below');
  readonly customClass = input<string>('');
  readonly menuItem = input<BurgerMenuItem[]>([]);

  readonly menuClick = output<BurgerMenuClickKey>();

  readonly orderedMenuItem = computed(() =>
    this.menuItem()
      .sort((a, b) => a.order - b.order)
      .filter((item) => !item.hidden),
  );
}
