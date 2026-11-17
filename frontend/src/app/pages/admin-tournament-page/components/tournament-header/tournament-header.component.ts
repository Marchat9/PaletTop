import { formatDate } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  LOCALE_ID,
  output,
} from '@angular/core';
import { Nullable } from 'src/app/models/nullable.model';
import { StructuredTournamentConfig } from 'src/app/models/tournament-configuration-detail.model';
import { TournamentStatus } from 'src/app/models/tournament-status.enum';
import { MatMenuModule } from '@angular/material/menu';
import { Button } from 'src/app/shared/button/button';
import { ButtonIcon } from 'src/app/shared/button-icon/button-icon';
import { AdminPageHeader } from 'src/app/shared/admin-page-header/admin-page-header';
import {
  AdminHeaderInfo,
  AdminHeaderStatus,
} from 'src/app/shared/admin-page-header/admin-page-header.model';
import { Icon } from 'src/app/shared/icon/icon';
import { RulePills } from 'src/app/shared/rule-pills/rule-pills';
import { StatusPillTone } from 'src/app/shared/status-pill/status-pill';
import { TournamentDto } from 'src/app/store/tournament/tournament.models';
import { buildTournamentRules } from 'src/app/utils/tournament-rules.util';

const STATUS_PRESENTATION: Record<string, { label: string; tone: StatusPillTone }> = {
  [TournamentStatus.DRAFT]: { label: 'Brouillon', tone: 'draft' },
  [TournamentStatus.ACTIVE]: { label: 'En cours', tone: 'ongoing' },
  [TournamentStatus.FINISHED]: { label: 'Terminé', tone: 'success' },
  [TournamentStatus.CANCELLED]: { label: 'Annulé', tone: 'error' },
};

@Component({
  selector: 'app-tournament-header',
  standalone: true,
  imports: [AdminPageHeader, Button, ButtonIcon, MatMenuModule, Icon, RulePills],
  templateUrl: './tournament-header.component.html',
  styleUrl: './tournament-header.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TournamentHeaderComponent {
  private readonly locale = inject(LOCALE_ID);

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
      case 'championship':
        return 'Championnat';
      default:
        return '-';
    }
  });
  public readonly rules = computed(() => buildTournamentRules(this.tournament()?.configuration));
  public readonly hasDescription = computed(() => !!this.tournament()?.description?.trim());
  public readonly statusPresentation = computed(() => {
    const status = this.tournament()?.status ?? 'UNKNOWN';
    return STATUS_PRESENTATION[status] ?? { label: status, tone: 'neutral' as StatusPillTone };
  });
  public readonly statuses = computed<AdminHeaderStatus[]>(() => {
    if (!this.tournament()) {
      return [];
    }
    // The phase only adds something while the tournament runs: once over, it repeats the status.
    const phase = this.tournament()?.status === TournamentStatus.ACTIVE ? this.phaseName() : null;
    return [
      this.statusPresentation(),
      ...(phase ? [{ label: phase, tone: 'neutral' as StatusPillTone }] : []),
    ];
  });
  public readonly infos = computed<AdminHeaderInfo[]>(() => {
    const tournament = this.tournament();
    return [
      {
        icon: 'event',
        label: 'Date du tournoi',
        value: this.formatOrDash(tournament?.date, 'dd/MM/yyyy'),
      },
      {
        icon: 'schedule',
        label: 'Création',
        value: this.formatOrDash(tournament?.createdAt, 'dd/MM/yyyy HH:mm'),
      },
      { icon: 'groups', label: 'Équipes', value: String(this.teamCount()) },
      { icon: 'emoji_events', label: 'Mode de tournoi', value: this.tournamentMode() },
    ];
  });

  private formatOrDash(value: Nullable<string | Date> | undefined, format: string): string {
    return value ? formatDate(value, format, this.locale) : '—';
  }
}
