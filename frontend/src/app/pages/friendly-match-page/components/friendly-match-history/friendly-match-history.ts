import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Button } from 'src/app/shared/button/button';
import { Card } from 'src/app/shared/card/card';
import { FriendlyMatchRecord } from 'src/app/store/friendly-match/friendly-match.reducer';

@Component({
  selector: 'app-friendly-match-history',
  imports: [Card, Button],
  templateUrl: './friendly-match-history.html',
  styleUrl: './friendly-match-history.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FriendlyMatchHistory {
  public readonly matchHistory = input<FriendlyMatchRecord[]>([]);
  public readonly deleteHistory = output<void>();
}
