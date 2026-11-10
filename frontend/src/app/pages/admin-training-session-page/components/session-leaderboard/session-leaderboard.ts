import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { Button } from 'src/app/shared/button/button';
import { CardCollapsible } from 'src/app/shared/card-collapsible/card-collapsible';
import { Icon } from 'src/app/shared/icon/icon';
import { Skeleton } from 'src/app/shared/skeleton/skeleton';
import { TrainingLeaderboardEntryDto } from 'src/app/store/training/training.models';

@Component({
  selector: 'app-session-leaderboard',
  imports: [CardCollapsible, Icon, Skeleton, Button],
  templateUrl: './session-leaderboard.html',
  styleUrl: './session-leaderboard.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SessionLeaderboard {
  public readonly leaderboard = input<TrainingLeaderboardEntryDto[]>([]);
  public readonly isLoading = input<boolean>(false);
  /** Offers the club leaderboard (not on the spectator page). */
  public readonly canOpenClubLeaderboard = input<boolean>(false);

  public readonly openClubLeaderboard = output<void>();

  protected readonly hasData = computed(() => this.leaderboard().length > 0);
}
