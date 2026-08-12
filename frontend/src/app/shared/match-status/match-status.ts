import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

@Component({
  selector: 'app-match-status',
  standalone: true,
  imports: [],
  templateUrl: './match-status.html',
  styleUrl: './match-status.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MatchStatusComponent {
  public readonly status = input.required<string>();
}
