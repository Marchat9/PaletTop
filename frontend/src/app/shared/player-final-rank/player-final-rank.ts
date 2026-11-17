import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Nullable } from 'src/app/models/nullable.model';
import { Icon } from 'src/app/shared/icon/icon';

/** End of a tournament or a session, in the player's match card: thanks, and the final rank. */
@Component({
  selector: 'app-player-final-rank',
  imports: [Icon],
  templateUrl: './player-final-rank.html',
  styleUrl: './player-final-rank.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlayerFinalRank {
  public readonly headline = input.required<string>();
  /** « 3e », « 2/12 »; the rank line is left out while unknown. */
  public readonly rankLabel = input<Nullable<string>>(null);
}
