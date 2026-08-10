import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
  selector: 'app-metric-tile',
  imports: [],
  templateUrl: './metric-tile.html',
  styleUrl: './metric-tile.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MetricTileComponent {
  public readonly value = input.required<string>();
  public readonly label = input.required<string>();

  public readonly size = input<'small' | 'normal' | 'big'>('normal');
  public readonly clickable = input<boolean>(false);

  public readonly clicked = output<void>();

  onClick(event?: Event): void {
    if (!this.clickable()) return;
    event?.preventDefault();
    this.clicked.emit();
  }
}
