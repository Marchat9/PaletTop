import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Button } from 'src/app/shared/button/button';
import { Card } from 'src/app/shared/card/card';
import { InputNumber } from 'src/app/shared/input-number/input-number';
import { InputText } from 'src/app/shared/input-text/input-text';

@Component({
  selector: 'app-friendly-match-config',
  imports: [Card, InputText, InputNumber, Button],
  templateUrl: './friendly-match-config.html',
  styleUrl: './friendly-match-config.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FriendlyMatchConfig {
  readonly team1Name = input<string>('');
  readonly team2Name = input<string>('');
  readonly targetScore = input<number>(15);
  readonly isMatchFinished = input<boolean>(false);
  readonly hasModifications = input<boolean>(false);

  readonly team1NameChange = output<string>();
  readonly team2NameChange = output<string>();
  readonly targetScoreChange = output<number>();
  readonly nextMatch = output<void>();
  readonly reset = output<void>();
}
