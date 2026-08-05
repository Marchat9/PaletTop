import { Dialog } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { JoinTournamentPopupComponent } from 'src/app/modales/join-tournament-popup/join-tournament-popup';

@Component({
  selector: 'app-player-connection-page',
  imports: [],
  templateUrl: './player-connection-page.html',
  styleUrl: './player-connection-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlayerConnectionPage {
  private readonly dialog = inject(Dialog);
  private readonly router = inject(Router);

  constructor() {
    this.dialog
      .open(JoinTournamentPopupComponent, {
        panelClass: 'dialog-panel',
        backdropClass: 'dialog-backdrop-light',
        disableClose: false,
      })
      .closed.subscribe((tournamentData) => {
        if (!!tournamentData) {
          const { tournamentCode, teamCode } = tournamentData as {
            tournamentCode: string;
            teamCode: string;
          };
          this.router.navigate([`/player/${tournamentCode}/${teamCode}`]);
        } else {
          this.router.navigate(['/accueil']);
        }
      });
  }
}
