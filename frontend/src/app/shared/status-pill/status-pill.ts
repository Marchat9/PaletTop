import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type StatusPillTone = 'neutral' | 'draft' | 'pending' | 'ongoing' | 'success' | 'error';

/** `xl` for a screen read from afar (spectator), `lg` for a page header, `sm` along a list. */
export type StatusPillSize = 'sm' | 'lg' | 'xl';

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
