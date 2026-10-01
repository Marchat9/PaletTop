import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { PlayerStatTile } from 'src/app/models/player-match-view.model';
import { MetricTileComponent } from '../metric-tile/metric-tile';

/** Statistics tiles of the player, at the top of their page (wins, ranking, points, and so on). */
@Component({
  selector: 'app-player-stats-tiles',
  imports: [MetricTileComponent],
  templateUrl: './player-stats-tiles.html',
  styleUrl: './player-stats-tiles.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlayerStatsTiles {
  public readonly tiles = input<PlayerStatTile[]>([]);

  public readonly tileClicked = output<PlayerStatTile>();
}
