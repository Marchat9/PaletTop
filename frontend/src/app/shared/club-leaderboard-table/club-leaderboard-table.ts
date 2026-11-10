import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { Nullable } from 'src/app/models/nullable.model';
import { Skeleton } from 'src/app/shared/skeleton/skeleton';
import { TrainingClubLeaderboardEntryDto } from 'src/app/store/training/training.models';

/** Club leaderboard table: rank, member, wins and points added up over the club's sessions. */
@Component({
  selector: 'app-club-leaderboard-table',
  imports: [Skeleton],
  templateUrl: './club-leaderboard-table.html',
  styleUrl: './club-leaderboard-table.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClubLeaderboardTable {
  public readonly entries = input<TrainingClubLeaderboardEntryDto[]>([]);
  public readonly isLoading = input<boolean>(false);
  public readonly error = input<Nullable<string>>(null);

  protected readonly hasData = computed(() => this.entries().length > 0);
}
