import { Component, output } from '@angular/core';
import { Button } from 'src/app/shared/button/button';
import { Card } from 'src/app/shared/card/card';
import { Icon } from 'src/app/shared/icon/icon';

@Component({
  selector: 'app-tournament-create',
  imports: [Card, Button, Icon],
  templateUrl: './tournament-create.html',
  styleUrl: './tournament-create.scss',
})
export class TournamentCreate {
  public readonly eventTournamentCreation = output<void>();
}
