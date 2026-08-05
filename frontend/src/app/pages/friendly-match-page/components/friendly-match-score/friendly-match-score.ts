import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Nullable } from 'src/app/models/nullable.model';
import { ScoreNumber } from 'src/app/shared/score-number/score-number';

@Component({
  selector: 'app-friendly-match-score',
  imports: [ScoreNumber],
  templateUrl: './friendly-match-score.html',
  styleUrl: './friendly-match-score.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FriendlyMatchScore {
  readonly team1Name = input<string>('');
  readonly team2Name = input<string>('');
  readonly team1Score = input<number>(0);
  readonly team2Score = input<number>(0);
  readonly targetScore = input.required<number>();
  readonly isMatchFinished = input<boolean>(false);
  readonly winner = input<Nullable<string>>(null);

  readonly team1ScoreChange = output<number>();
  readonly team2ScoreChange = output<number>();
}
