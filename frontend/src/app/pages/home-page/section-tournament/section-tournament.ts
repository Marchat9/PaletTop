import { Component, output } from '@angular/core';
import { TournamentJoin } from './tournament-join/tournament-join';
import { TournamentCreate } from './tournament-create/tournament-create';

@Component({
  selector: 'app-section-tournament',
  imports: [TournamentJoin, TournamentCreate],
  templateUrl: './section-tournament.html',
  styleUrl: './section-tournament.scss',
})
export class SectionTournament {
  public readonly eventTournamentJoin = output<void>();
  public readonly eventTournamentCreation = output<void>();
}
