import { Dialog } from '@angular/cdk/dialog';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  Signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { JoinTournamentPopupComponent } from 'src/app/modales/join-tournament-popup/join-tournament-popup';
import { SpectateTournamentPopupComponent } from 'src/app/modales/spectate-tournament-popup/spectate-tournament-popup';
import { Metric } from 'src/app/models/metric.model';
import { SectionMetrics } from 'src/app/pages/home-page/section-metrics/section-metrics';
import { loadMetrics } from 'src/app/store/metrics/metrics.actions';
import { selectMetrics } from 'src/app/store/metrics/metrics.selectors';
import { SectionFriendlyMatch } from './section-friendly-match/section-friendly-match';
import { SectionTournament } from './section-tournament/section-tournament';
import { TitleAndDescription } from './title-and-description/title-and-description';

@Component({
  selector: 'app-home-page',
  imports: [TitleAndDescription, SectionTournament, SectionFriendlyMatch, SectionMetrics],
  templateUrl: './home-page.html',
  styleUrl: './home-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomePageComponent implements OnInit {
  private readonly dialog = inject(Dialog);
  private readonly router: Router = inject(Router);
  private readonly store: Store = inject(Store);

  private readonly metricsData = this.store.selectSignal(selectMetrics);

  public readonly metrics: Signal<Metric[]> = computed(() => {
    if (!this.metricsData()) return [];

    const activeTournament: string =
      (this.metricsData()?.tournaments?.active ?? 0) +
      (this.metricsData()?.tournaments?.draft ?? 0) +
      '';

    const pastTournament: string =
      (this.metricsData()?.tournaments?.completed ?? 0) +
      (this.metricsData()?.tournaments?.cancelled ?? 0) +
      '';

    return [
      { value: activeTournament, label: 'Tournois actifs' },
      { value: pastTournament, label: 'Tournois passés' },
      { value: this.metricsData()?.clubs?.total + '', label: 'Clubs actifs' },
    ];
  });

  ngOnInit(): void {
    this.store.dispatch(loadMetrics());
  }

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

  public openModaleTournamentSpectate(): void {
    this.dialog
      .open(SpectateTournamentPopupComponent, {
        panelClass: 'dialog-panel',
        backdropClass: 'dialog-backdrop',
        disableClose: false,
      })
      .closed.subscribe((tournamentData) => {
        if (!!tournamentData) {
          const { tournamentCode } = tournamentData as { tournamentCode: string };
          this.router.navigate(['/spectateur', tournamentCode]);
        }
      });
  }
}
