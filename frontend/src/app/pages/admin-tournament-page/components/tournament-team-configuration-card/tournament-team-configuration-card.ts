import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { Nullable } from 'src/app/models/nullable.model';
import { TeamConfigEvent } from 'src/app/models/team-config.model';
import { TournamentStatus } from 'src/app/models/tournament-status.enum';
import { PdfExportService } from 'src/app/services/pdf-export.service';
import { CardCollapsible } from 'src/app/shared/card-collapsible/card-collapsible';
import { Icon } from 'src/app/shared/icon/icon';
import { Notification } from 'src/app/store/app-config/app-config.model';
import { TournamentDto } from 'src/app/store/tournament/tournament.models';
import { Button } from 'src/app/shared/button/button';
import { TeamConfig } from './team-config/team-config';
import { newId } from 'src/app/utils/unique-id.util';
import { buildTeamListPdf, teamListPdfFileName } from 'src/app/utils/pdf/team-list-pdf.util';

@Component({
  selector: 'app-tournament-team-configuration-card',
  standalone: true,
  imports: [CardCollapsible, TeamConfig, Button, Icon],
  templateUrl: './tournament-team-configuration-card.html',
  styleUrl: './tournament-team-configuration-card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TournamentTeamConfigurationCard {
  // ======= Input / Output =======
  public readonly tournament = input<Nullable<TournamentDto>>(null);

  public readonly onTeamUpdate = output<TeamConfigEvent>();
  public readonly notification = output<Notification>();
  // ==============================

  public readonly isExporting = signal(false);

  private readonly teamConfig = viewChild(TeamConfig);
  private readonly pdfExport = inject(PdfExportService);

  /** "Add a team" asked from the next-step card. */
  public startTeamCreation(): void {
    this.teamConfig()?.startTeamCreation();
  }

  public readonly hasTeams = computed(() => (this.tournament()?.teams?.length ?? 0) > 0);

  // Si le tournoi n'a pas de limite d'équipe, on affiche toujours la section de configuration des équipes
  // Sinon on affiche la section de configuration des équipes tant que le nombre d'équipe est inférieur à 90% de la limite
  public readonly isExpanded = computed(() => {
    const tournamentLimitTeams = this.tournament()?.configuration?.maxTeamCapacity ?? 0;
    const teamsLength = this.tournament()?.teams?.length ?? 0;
    const tournamentStatus = this.tournament()?.status;

    return (
      tournamentStatus === TournamentStatus.DRAFT &&
      (tournamentLimitTeams === 0 ||
        teamsLength < tournamentLimitTeams - Math.ceil(tournamentLimitTeams / 10))
    );
  });

  /** Downloads the team list as an A4 PDF (header, codes and join QR codes). */
  public async downloadTeamList(): Promise<void> {
    const tournament = this.tournament();
    if (!tournament || this.isExporting()) {
      return;
    }

    this.isExporting.set(true);
    try {
      await this.pdfExport.download(
        buildTeamListPdf(tournament, window.location.origin),
        teamListPdfFileName(tournament),
      );
    } catch {
      this.emitExportErrorNotification();
    } finally {
      this.isExporting.set(false);
    }
  }

  private emitExportErrorNotification(): void {
    this.notification.emit({
      id: newId(),
      message: "La liste des équipes n'a pas pu être générée. Réessayez.",
      typeIcon: 'warning',
      type: 'Téléchargement',
      createdAt: Date.now(),
    });
  }
}
