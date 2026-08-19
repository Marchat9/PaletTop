import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Icon } from 'src/app/shared/icon/icon';

@Component({
  selector: 'app-metric-tile',
  imports: [Icon],
  templateUrl: './metric-tile.html',
  styleUrl: './metric-tile.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MetricTileComponent {
  public readonly value = input.required<string>();
  public readonly label = input.required<string>();

  // "responsive" looks like "big" by default and falls back to "normal" sizing
  // below the mobile breakpoint (see metric-tile.scss).
  public readonly size = input<'small' | 'normal' | 'big' | 'responsive'>('normal');
  public readonly clickable = input<boolean>(false);

  public readonly clicked = output<void>();

  onClick(event?: Event): void {
    if (!this.clickable()) return;
    event?.preventDefault();
    this.clicked.emit();
  }
}
