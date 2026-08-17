import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { Nullable } from 'src/app/models/nullable.model';
import { StructuredTournamentConfig } from 'src/app/models/tournament-configuration-detail.model';
import { TournamentStatus } from 'src/app/models/tournament-status.enum';
import { Button } from 'src/app/shared/button/button';
import { Card } from 'src/app/shared/card/card';
import { Icon } from 'src/app/shared/icon/icon';
import { TournamentDto } from 'src/app/store/tournament/tournament.models';

const STATUS_PRESENTATION: Record<string, { label: string; tone: string }> = {
  [TournamentStatus.DRAFT]: { label: 'Brouillon', tone: 'draft' },
  [TournamentStatus.ACTIVE]: { label: 'En cours', tone: 'active' },
  [TournamentStatus.FINISHED]: { label: 'Terminé', tone: 'finished' },
  [TournamentStatus.CANCELLED]: { label: 'Annulé', tone: 'cancelled' },
};

@Component({
  selector: 'app-tournament-header',
  standalone: true,
  imports: [DatePipe, Card, Button, Icon],
  templateUrl: './tournament-header.component.html',
  styleUrl: './tournament-header.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TournamentHeaderComponent {
  // ======= Input / Output =======
  public readonly tournament = input<Nullable<TournamentDto>>(null);
  public readonly completeLoading = input<boolean>(false);

  public readonly completeTournament = output<void>();
  public readonly disconnect = output<void>();
  // ==============================

  private readonly tournamentStatus = computed(() => this.tournament()?.tournamentStatus ?? null);
  public readonly canFinishTournament = computed(
    () => this.tournamentStatus()?.canFinishTournament ?? false,
  );
  public readonly phaseName = computed(() => this.tournamentStatus()?.phaseName ?? null);

  public readonly teamCount = computed(() => this.tournament()?.teams?.length ?? 0);
  public readonly tournamentMode = computed(() => {
    switch (this.tournament()?.configuration.competitionMode) {
      case 'standard':
        const hasQualifications =
          ((this.tournament()?.configuration.competitionConfiguration as StructuredTournamentConfig)
            .numberOfQualifyingRounds || 0) > 0;
        return `Tournoi ${hasQualifications ? 'avec qualifications et ' : 'avec'} éliminations`;
      case 'up_down':
        return 'Montante / Descendante';
      default:
        return '-';
    }
  });
  public readonly hasDescription = computed(() => !!this.tournament()?.description?.trim());
  public readonly statusPresentation = computed(() => {
    const status = this.tournament()?.status ?? 'UNKNOWN';
    return STATUS_PRESENTATION[status] ?? { label: status, tone: 'unknown' };
  });
}
