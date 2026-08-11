import { Dialog } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { SpectateTournamentPopupComponent } from 'src/app/modales/spectate-tournament-popup/spectate-tournament-popup';

@Component({
  selector: 'app-spectator-connection-page',
  imports: [],
  templateUrl: './spectator-connection-page.html',
  styleUrl: './spectator-connection-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SpectatorConnectionPageComponent {
  private readonly dialog = inject(Dialog);
  private readonly router = inject(Router);

  constructor() {
    this.dialog
      .open(SpectateTournamentPopupComponent, {
        panelClass: 'dialog-panel',
        backdropClass: 'dialog-backdrop-light',
        disableClose: false,
      })
      .closed.subscribe((tournamentData) => {
        if (!!tournamentData) {
          const { tournamentCode } = tournamentData as { tournamentCode: string };
          this.router.navigate(['/spectateur', tournamentCode]);
        } else {
          this.router.navigate(['/accueil']);
        }
      });
  }
}
