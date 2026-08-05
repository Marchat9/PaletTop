import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Icon } from 'src/app/shared/icon/icon';

@Component({
  selector: 'app-button-icon',
  imports: [Icon],
  templateUrl: './button-icon.html',
  styleUrl: './button-icon.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ButtonIcon {
  public readonly maxNumberOfNotifications = 9;

  public readonly icon = input.required<string>();
  public readonly badge = input<number | null>(null);
  public readonly clicked = output<void>();
}
