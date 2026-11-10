import { Dialog } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { SpectateTrainingPopup } from 'src/app/modales/spectate-training-popup/spectate-training-popup';

/** Entry of the training spectator mode without a code in the URL: asks for it. */
@Component({
  selector: 'app-spectator-training-connection-page',
  imports: [],
  template: '',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SpectatorTrainingConnectionPage {
  private readonly dialog = inject(Dialog);
  private readonly router = inject(Router);

  constructor() {
    this.dialog
      .open<{ sessionCode: string }>(SpectateTrainingPopup, {
        panelClass: 'dialog-panel',
        backdropClass: 'dialog-backdrop-light',
        disableClose: false,
      })
      .closed.subscribe((codes) => {
        if (codes) {
          void this.router.navigate(['/spectateur/training', codes.sessionCode]);
        } else {
          void this.router.navigate(['/accueil']);
        }
      });
  }
}
