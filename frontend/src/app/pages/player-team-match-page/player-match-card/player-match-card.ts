import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Nullable } from 'src/app/models/nullable.model';
import { PlayerMatchDto } from 'src/app/models/player-match.model';
import { PlayerMatchCardInnerComponent } from './player-match-card-inner/player-match-card-inner';
import { Icon } from 'src/app/shared/icon/icon';
import { StartMatch } from 'src/app/models/start-match.model';
import { TeamScoreUpdate } from 'src/app/models/score-update.model';
import { ValidateMatch } from 'src/app/models/match-validate-score.model';
import { TeamMatchStatus } from 'src/app/pages/player-team-match-page/player-team-match-page';

@Component({
  selector: 'app-player-match-card',
  standalone: true,
  imports: [PlayerMatchCardInnerComponent, Icon],
  templateUrl: './player-match-card.html',
  styleUrl: './player-match-card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlayerMatchCardComponent {
  public readonly match = input.required<Nullable<PlayerMatchDto>>();
  public readonly teamMatchStatus = input<Nullable<TeamMatchStatus>>();
  public readonly teamId = input.required<string>();
  public readonly teamCode = input.required<string>();
  public readonly pointsPerGame = input<number>(13);
  public readonly startMatchError = input<Nullable<string>>();
  public readonly validateMatchError = input<Nullable<string>>();
  public readonly updateScoreError = input<Nullable<string>>();
  public readonly startMatchLoading = input<boolean>(false);
  public readonly validateMatchLoading = input<boolean>(false);
  public readonly rank = input<string>('');

  public readonly startMatch = output<StartMatch>();
  public readonly updateScore = output<TeamScoreUpdate>();
  public readonly validateMatch = output<ValidateMatch>();
}
