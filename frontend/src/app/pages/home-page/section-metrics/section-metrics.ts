import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Metric } from 'src/app/models/metric.model';
import { MetricTileComponent } from 'src/app/shared/metric-tile/metric-tile';

@Component({
  selector: 'app-section-metrics',
  imports: [MetricTileComponent],
  templateUrl: './section-metrics.html',
  styleUrl: './section-metrics.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SectionMetrics {
  public readonly metrics = input<Metric[]>();
}
