import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { TeamDto } from 'src/app/models/team.model';
import { MetricTileComponent } from 'src/app/shared/metric-tile/metric-tile';

@Component({
  selector: 'app-player-team-header',
  standalone: true,
  imports: [MetricTileComponent],
  templateUrl: './player-team-header.html',
  styleUrl: './player-team-header.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlayerTeamHeaderComponent {
  public readonly team = input.required<TeamDto>();
  public readonly tournamentCode = input.required<string>();
  public readonly wins = input<string>('—');
  public readonly rank = input<string>('—');

  public readonly openRank = output<void>();
}
