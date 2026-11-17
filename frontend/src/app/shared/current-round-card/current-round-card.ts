import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { AdminMatchGroup } from 'src/app/models/admin-match.model';
import { Nullable } from 'src/app/models/nullable.model';
import { ScoreUpdate } from 'src/app/models/score-update.model';
import { Button } from 'src/app/shared/button/button';
import { CardCollapsible } from 'src/app/shared/card-collapsible/card-collapsible';
import { Icon } from 'src/app/shared/icon/icon';
import { RoundMatchList } from 'src/app/shared/round-match-list/round-match-list';
import { Skeleton } from 'src/app/shared/skeleton/skeleton';

/**
 * Current round of an admin page, tournament or training: its matches, whose scores can be
 * corrected, and the button launching the next round. Without matches to show, a message tells
 * where things stand.
 */
@Component({
  selector: 'app-current-round-card',
  imports: [Button, CardCollapsible, Icon, RoundMatchList, Skeleton],
  templateUrl: './current-round-card.html',
  styleUrl: './current-round-card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CurrentRoundCard {
  // ======= Input / Output =======
  public readonly roundNumber = input<Nullable<number>>(null);
  public readonly groups = input<AdminMatchGroup[]>([]);
  /** The matches are listed (an active tournament, a session with a round). */
  public readonly showMatches = input<boolean>(false);
  public readonly pointsPerGame = input<number>(13);
  public readonly editable = input<boolean>(true);
  public readonly scoreUpdateLoading = input<boolean>(false);
  /** Shown while no match is listed. */
  public readonly message = input<Nullable<string>>(null);
  public readonly isLoading = input<boolean>(false);

  public readonly showNextButton = input<boolean>(false);
  public readonly nextLabel = input<string>('Round suivant');
  public readonly canGenerateNext = input<boolean>(false);
  public readonly nextLoading = input<boolean>(false);

  public readonly nextRound = output<void>();
  public readonly scoreUpdate = output<ScoreUpdate>();
  // ==============================
}
