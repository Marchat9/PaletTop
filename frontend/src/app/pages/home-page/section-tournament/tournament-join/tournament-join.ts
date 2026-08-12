import { ChangeDetectionStrategy, Component, output } from '@angular/core';
import { Button } from 'src/app/shared/button/button';
import { Card } from 'src/app/shared/card/card';
import { Icon } from 'src/app/shared/icon/icon';

@Component({
  selector: 'app-tournament-join',
  imports: [Card, Button, Icon],
  templateUrl: './tournament-join.html',
  styleUrl: './tournament-join.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TournamentJoin {
  public readonly eventTournamentJoin = output<void>();
  public readonly eventTournamentSpectate = output<void>();
}
