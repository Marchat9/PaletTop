import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { Nullable } from 'src/app/models/nullable.model';
import { TournamentDto } from 'src/app/store/tournament/tournament.models';

export interface PrintableTeam {
  id: string;
  name: string;
  code: string;
  playerNames: string;
}

@Component({
  selector: 'app-team-print-sheet',
  standalone: true,
  templateUrl: './team-print-sheet.html',
  styleUrl: './team-print-sheet.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TeamPrintSheet {
  public readonly tournament = input<Nullable<TournamentDto>>(null);

  public readonly sortedTeams = computed<PrintableTeam[]>(() =>
    [...(this.tournament()?.teams ?? [])]
      .map((team) => ({
        id: team.id,
        name: team.name,
        code: team.code ?? '',
        playerNames: team.players.map((player) => player.name).join(', '),
      }))
      .sort((a, b) => a.name.localeCompare(b.name)),
  );
}
