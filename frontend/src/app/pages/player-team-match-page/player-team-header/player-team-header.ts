import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { Nullable } from 'src/app/models/nullable.model';
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
  public readonly nbTeams = input<Nullable<number>>();

  public readonly openRank = output<void>();

  public readonly rankLabel = computed(() =>
    !!this.nbTeams() ? `${this.rank()}/${this.nbTeams()}` : this.rank(),
  );
}
