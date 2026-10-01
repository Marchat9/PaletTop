import { Dialog } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { JoinTrainingPopup } from 'src/app/modales/join-training-popup/join-training-popup';

@Component({
  selector: 'app-training-player-connection-page',
  imports: [],
  templateUrl: './training-player-connection-page.html',
  styleUrl: './training-player-connection-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TrainingPlayerConnectionPage {
  private readonly dialog = inject(Dialog);
  private readonly router = inject(Router);

  constructor() {
    this.dialog
      .open(JoinTrainingPopup, {
        panelClass: 'dialog-panel',
        backdropClass: 'dialog-backdrop-light',
        disableClose: false,
      })
      .closed.subscribe((trainingData) => {
        if (!!trainingData) {
          const { sessionCode, participantCode } = trainingData as {
            sessionCode: string;
            participantCode: string;
          };
          this.router.navigate([`/player/training/${sessionCode}/${participantCode}`]);
        } else {
          this.router.navigate(['/accueil']);
        }
      });
  }
}
