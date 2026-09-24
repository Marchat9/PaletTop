import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { CardCollapsible } from 'src/app/shared/card-collapsible/card-collapsible';
import { Icon } from 'src/app/shared/icon/icon';
import { Skeleton } from 'src/app/shared/skeleton/skeleton';
import { TrainingLeaderboardEntryDto } from 'src/app/store/training/training.models';

@Component({
  selector: 'app-session-leaderboard',
  imports: [CardCollapsible, Icon, Skeleton],
  templateUrl: './session-leaderboard.html',
  styleUrl: './session-leaderboard.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SessionLeaderboard {
  public readonly leaderboard = input<TrainingLeaderboardEntryDto[]>([]);
  public readonly isLoading = input<boolean>(false);

  protected readonly hasData = computed(() => this.leaderboard().length > 0);
}
