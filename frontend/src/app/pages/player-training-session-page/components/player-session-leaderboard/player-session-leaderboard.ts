import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { Nullable } from 'src/app/models/nullable.model';
import { CardCollapsible } from 'src/app/shared/card-collapsible/card-collapsible';
import { Icon } from 'src/app/shared/icon/icon';
import { TrainingLeaderboardEntryDto } from 'src/app/store/training/training.models';

@Component({
  selector: 'app-player-session-leaderboard',
  imports: [CardCollapsible, Icon],
  templateUrl: './player-session-leaderboard.html',
  styleUrl: './player-session-leaderboard.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlayerSessionLeaderboard {
  public readonly leaderboard = input<TrainingLeaderboardEntryDto[]>([]);
  /** Met en avant la ligne du joueur qui consulte la page. */
  public readonly myParticipantId = input<Nullable<string>>(null);

  protected readonly hasData = computed(() => this.leaderboard().length > 0);
}
