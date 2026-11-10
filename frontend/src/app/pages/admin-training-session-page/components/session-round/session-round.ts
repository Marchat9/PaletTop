import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { Nullable } from 'src/app/models/nullable.model';
import { Icon } from 'src/app/shared/icon/icon';
import { Skeleton } from 'src/app/shared/skeleton/skeleton';
import { TrainingRoundDto } from 'src/app/store/training/training.models';
import { TrainingScoreUpdate } from '../../admin-training-session-page.models';
import { RoundMatches } from '../round-matches/round-matches';

@Component({
  selector: 'app-session-round',
  imports: [Icon, Skeleton, RoundMatches],
  templateUrl: './session-round.html',
  styleUrl: './session-round.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SessionRound {
  public readonly round = input<Nullable<TrainingRoundDto>>(null);
  public readonly pointsPerGame = input<number>(13);
  public readonly isSessionOpen = input<boolean>(false);
  public readonly isLoading = input<boolean>(false);
  public readonly scoreLoading = input<boolean>(false);
  // Empty state, addressed to the admin by default (the spectator page has its own wording).
  public readonly emptyTitle = input<string>('Aucun round généré');
  public readonly emptyMessage = input<string>(
    'Inscrivez les joueurs présents, puis générez le premier round : les équipes seront formées automatiquement selon les réglages de la séance.',
  );

  public readonly updateScore = output<TrainingScoreUpdate>();

  protected readonly matchCount = computed(
    () => this.round()?.matches.filter((match) => !match.isBye).length ?? 0,
  );
  protected readonly byeCount = computed(
    () =>
      this.round()
        ?.matches.filter((match) => match.isBye)
        .reduce((total, match) => total + (match.teamA?.members.length ?? 0), 0) ?? 0,
  );
  protected readonly isRoundOpen = computed(() => this.round()?.status === 'OPEN');
}
