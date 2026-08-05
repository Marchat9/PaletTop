import { Dialog } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { first, of, switchMap } from 'rxjs';
import { AdminTournamentConnectionPopupComponent } from 'src/app/modales/admin-tournament-connection-popup/admin-tournament-connection-popup';
import { selectCurrentTournamentAdminInformations } from 'src/app/store/tournament/tournament.selectors';

@Component({
  selector: 'app-admin-connection-page',
  imports: [],
  templateUrl: './admin-connection-page.html',
  styleUrl: './admin-connection-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminConnectionPageComponent {
  private readonly dialog = inject(Dialog);
  private readonly router = inject(Router);
  private readonly store = inject(Store);

  constructor() {
    this.store
      .select(selectCurrentTournamentAdminInformations)
      .pipe(
        first(),
        switchMap((adminInfo) => {
          if (!!adminInfo?.code && !!adminInfo.password) {
            return of({ tournamentCode: adminInfo.code });
          } else {
            return this.dialog.open(AdminTournamentConnectionPopupComponent, {
              panelClass: 'dialog-panel',
              backdropClass: 'dialog-backdrop-light',
              disableClose: false,
            }).closed;
          }
        }),
      )
      .subscribe((tournamentData) => {
        if (!!tournamentData) {
          const { tournamentCode } = tournamentData as { tournamentCode: string };
          this.router.navigate([`/admin/${tournamentCode}`]);
        } else {
          this.router.navigate(['/accueil']);
        }
      });
  }
}
