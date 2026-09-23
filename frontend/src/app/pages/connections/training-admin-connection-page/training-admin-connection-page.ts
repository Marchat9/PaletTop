import { Dialog } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { first, of, switchMap } from 'rxjs';
import { AdminTrainingConnectionPopupComponent } from 'src/app/modales/admin-training-connection-popup/admin-training-connection-popup';
import { selectCurrentTrainingAdminInformations } from 'src/app/store/training/training.selectors';

@Component({
  selector: 'app-training-admin-connection-page',
  imports: [],
  templateUrl: './training-admin-connection-page.html',
  styleUrl: './training-admin-connection-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TrainingAdminConnectionPage {
  private readonly dialog = inject(Dialog);
  private readonly router = inject(Router);
  private readonly store = inject(Store);

  constructor() {
    this.store
      .select(selectCurrentTrainingAdminInformations)
      .pipe(
        first(),
        switchMap((adminInfo) => {
          if (!!adminInfo?.code && !!adminInfo.password) {
            return of({ trainingCode: adminInfo.code });
          } else {
            return this.dialog.open(AdminTrainingConnectionPopupComponent, {
              panelClass: 'dialog-panel',
              backdropClass: 'dialog-backdrop-light',
              disableClose: false,
            }).closed;
          }
        }),
      )
      .subscribe((trainingData) => {
        if (!!trainingData) {
          const { trainingCode } = trainingData as { trainingCode: string };
          this.router.navigate([`/admin/training/${trainingCode}`]);
        } else {
          this.router.navigate(['/accueil']);
        }
      });
  }
}
