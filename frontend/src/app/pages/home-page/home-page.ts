import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { SectionFriendlyMatch } from './section-friendly-match/section-friendly-match';
import { SectionTournament } from './section-tournament/section-tournament';
import { TitleAndDescription } from './title-and-description/title-and-description';
import { SectionMetrics } from 'src/app/pages/home-page/section-metrics/section-metrics';
import { Dialog } from '@angular/cdk/dialog';
import { JoinTournamentPopupComponent } from 'src/app/modales/join-tournament-popup/join-tournament-popup';
import { Metric } from 'src/app/models/metric.model';

@Component({
  selector: 'app-home-page',
  imports: [TitleAndDescription, SectionTournament, SectionFriendlyMatch, SectionMetrics],
  templateUrl: './home-page.html',
  styleUrl: './home-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomePageComponent {
  private readonly dialog = inject(Dialog);
  private readonly router: Router = inject(Router);

  // Todo récupérer les métriques depuis le store.
  public readonly metrics = signal<Metric[]>([
    { value: '128', label: 'Parties ce jour' },
    { value: '1.2k', label: 'Maitres artisans' },
    { value: '0.5mm', label: 'Precision moyenne' },
    { value: '42', label: 'Clubs actifs' },
  ]);

  public goToTournamentCreation(): void {
    this.router.navigate(['/admin/tournament-creation']);
  }

  public goToFriendlyMatch(): void {
    this.router.navigate(['/friendly-match']);
  }

  public openModaleTournamentJoin(): void {
    this.dialog
      .open(JoinTournamentPopupComponent, {
        panelClass: 'dialog-panel',
        backdropClass: 'dialog-backdrop',
        disableClose: false,
      })
      .closed.subscribe((tournamentData) => {
        if (!!tournamentData) {
          const { tournamentCode, teamCode } = tournamentData as {
            tournamentCode: string;
            teamCode: string;
          };
          this.router.navigate([`/player/${tournamentCode}/${teamCode}`]);
        }
      });
  }
}
