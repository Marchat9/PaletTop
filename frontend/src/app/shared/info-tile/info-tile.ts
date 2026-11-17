import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Icon } from 'src/app/shared/icon/icon';

/**
 * A piece of information of a header: an icon, what it is, and its value - a number, a date or a
 * sentence (a tournament mode), which wraps instead of overflowing.
 */
@Component({
  selector: 'app-info-tile',
  imports: [Icon],
  templateUrl: './info-tile.html',
  styleUrl: './info-tile.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InfoTile {
  public readonly icon = input.required<string>();
  public readonly label = input.required<string>();
  public readonly value = input.required<string>();
}
