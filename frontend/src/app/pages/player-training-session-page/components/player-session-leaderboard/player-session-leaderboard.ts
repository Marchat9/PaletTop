import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { Button } from 'src/app/shared/button/button';
import { Nullable } from 'src/app/models/nullable.model';
import { CardCollapsible } from 'src/app/shared/card-collapsible/card-collapsible';
import { Icon } from 'src/app/shared/icon/icon';
import { TrainingLeaderboardEntryDto } from 'src/app/store/training/training.models';

@Component({
  selector: 'app-player-session-leaderboard',
  imports: [CardCollapsible, Icon, Button],
  templateUrl: './player-session-leaderboard.html',
  styleUrl: './player-session-leaderboard.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlayerSessionLeaderboard {
  public readonly leaderboard = input<TrainingLeaderboardEntryDto[]>([]);
  /** Highlights the row of the player reading the page. */
  public readonly myParticipantId = input<Nullable<string>>(null);

  public readonly openClubLeaderboard = output<void>();

  protected readonly hasData = computed(() => this.leaderboard().length > 0);
}
