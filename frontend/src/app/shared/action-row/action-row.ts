import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Icon } from 'src/app/shared/icon/icon';

/**
 * A clickable list row: an icon box, a title, an optional description and a chevron.
 * Used for secondary navigation actions (e.g. the organiser actions of the home page cards).
 */
@Component({
  selector: 'app-action-row',
  imports: [Icon],
  templateUrl: './action-row.html',
  styleUrl: './action-row.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ActionRow {
  public readonly icon = input.required<string>();
  public readonly title = input.required<string>();
  public readonly description = input<string>();
  public readonly clicked = output<void>();
}
