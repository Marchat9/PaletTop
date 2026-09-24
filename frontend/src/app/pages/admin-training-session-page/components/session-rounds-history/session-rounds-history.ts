import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CardCollapsible } from 'src/app/shared/card-collapsible/card-collapsible';
import { Icon } from 'src/app/shared/icon/icon';
import { TrainingRoundDto } from 'src/app/store/training/training.models';
import { RoundMatches } from '../round-matches/round-matches';

@Component({
  selector: 'app-session-rounds-history',
  imports: [CardCollapsible, Icon, RoundMatches],
  templateUrl: './session-rounds-history.html',
  styleUrl: './session-rounds-history.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SessionRoundsHistory {
  /** Rounds précédents, du plus récent au plus ancien. */
  public readonly rounds = input<TrainingRoundDto[]>([]);
  public readonly pointsPerGame = input<number>(13);
}
