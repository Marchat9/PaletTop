import { Component, output } from '@angular/core';
import { Card } from 'src/app/shared/card/card';
import { Icon } from 'src/app/shared/icon/icon';
import { Button } from 'src/app/shared/button/button';

@Component({
  selector: 'app-section-tournament',
  imports: [Card, Icon, Button],
  templateUrl: './section-tournament.html',
  styleUrl: './section-tournament.scss',
})
export class SectionTournament {
  public readonly eventTournamentJoin = output<void>();
  public readonly eventTournamentSpectate = output<void>();
  public readonly eventTournamentCreation = output<void>();
}
