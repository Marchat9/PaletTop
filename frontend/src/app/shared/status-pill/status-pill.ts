import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type StatusPillTone = 'neutral' | 'draft' | 'pending' | 'ongoing' | 'success' | 'error';

/** `lg` pour un en-tête de page, `sm` au fil d'une liste ou d'une carte. */
export type StatusPillSize = 'sm' | 'lg';

@Component({
  selector: 'app-status-pill',
  standalone: true,
  imports: [],
  templateUrl: './status-pill.html',
  styleUrl: './status-pill.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatusPill {
  public readonly tone = input<StatusPillTone>('neutral');
  public readonly size = input<StatusPillSize>('sm');
}
