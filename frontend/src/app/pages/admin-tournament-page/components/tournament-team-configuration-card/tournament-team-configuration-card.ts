import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  Injector,
  afterNextRender,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { Nullable } from 'src/app/models/nullable.model';
import { TeamConfigEvent } from 'src/app/models/team-config.model';
import { TournamentStatus } from 'src/app/models/tournament-status.enum';
import { CardCollapsible } from 'src/app/shared/card-collapsible/card-collapsible';
import { Icon } from 'src/app/shared/icon/icon';
import { Notification } from 'src/app/store/app-config/app-config.model';
import { TournamentDto } from 'src/app/store/tournament/tournament.models';
import { Button } from 'src/app/shared/button/button';
import { TeamConfig } from './team-config/team-config';
import { TeamPrintSheet } from './team-print-sheet/team-print-sheet';

// beforeprint fires as soon as the browser's print engine engages, before the
// dialog opens — independent of how long the user takes with it afterwards.
const PRINT_ENGAGEMENT_TIMEOUT_MS = 1000;

@Component({
  selector: 'app-tournament-team-configuration-card',
  standalone: true,
  imports: [CardCollapsible, TeamConfig, TeamPrintSheet, Button, Icon],
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

  public readonly isPrinting = signal(false);

  public readonly hasTeams = computed(() => (this.tournament()?.teams?.length ?? 0) > 0);

  private readonly injector = inject(Injector);

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

  constructor() {
    const onAfterPrint = () => this.isPrinting.set(false);
    window.addEventListener('afterprint', onAfterPrint);
    inject(DestroyRef).onDestroy(() => window.removeEventListener('afterprint', onAfterPrint));
  }

  public printTeamList(): void {
    this.isPrinting.set(true);
    afterNextRender(
      () => {
        let printEngaged = false;
        const onBeforePrint = () => (printEngaged = true);

        window.addEventListener('beforeprint', onBeforePrint, { once: true });
        window.print();

        // Some browsers (e.g. VS Code's embedded browser) never fire beforeprint
        // or afterprint at all — if beforeprint hasn't fired by now, the print
        // engine never engaged, so warn the admin.
        setTimeout(() => {
          window.removeEventListener('beforeprint', onBeforePrint);
          if (!printEngaged) {
            this.emitPrintErrorNotification();
          }
        }, PRINT_ENGAGEMENT_TIMEOUT_MS);
      },
      { injector: this.injector },
    );
  }

  private emitPrintErrorNotification(): void {
    this.notification.emit({
      id: crypto.randomUUID(),
      message:
        "Votre navigateur ne semble pas prendre en charge l'impression. Essayez avec un autre navigateur (Chrome, Firefox, Edge).",
      typeIcon: 'warning',
      type: 'Impression',
      createdAt: Date.now(),
    });
  }
}
