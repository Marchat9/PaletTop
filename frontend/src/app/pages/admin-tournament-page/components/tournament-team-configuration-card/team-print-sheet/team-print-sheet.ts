import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { Nullable } from 'src/app/models/nullable.model';
import { QrCode } from 'src/app/shared/qr-code/qr-code';
import { TournamentDto } from 'src/app/store/tournament/tournament.models';

export interface PrintableTeam {
  id: string;
  name: string;
  code: string;
  playerNames: string;
  playerUrl: Nullable<string>;
}

@Component({
  selector: 'app-team-print-sheet',
  standalone: true,
  imports: [QrCode],
  templateUrl: './team-print-sheet.html',
  styleUrl: './team-print-sheet.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TeamPrintSheet {
  public readonly tournament = input<Nullable<TournamentDto>>(null);

  public readonly appUrl: string = window.location.origin;
  public readonly sortedTeams = computed<PrintableTeam[]>(() => {
    const tournamentCode = this.tournament()?.code ?? '';

    return [...(this.tournament()?.teams ?? [])]
      .map((team) => ({
        id: team.id,
        name: team.name,
        code: team.code ?? '',
        playerNames: team.players.map((player) => player.name).join(', '),
        playerUrl: team.code ? `${this.appUrl}/player/${tournamentCode}/${team.code}` : '',
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  });
}
