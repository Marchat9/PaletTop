import { DialogRef } from '@angular/cdk/dialog';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { Store } from '@ngrx/store';
import { resetTraining } from 'src/app/store/training/training.actions';
import { connectTrainingAdministrator } from 'src/app/store/training/training.admin.actions';
import {
  selectCurrentTrainingAdminInformations,
  selectCurrentTrainingData,
  selectCurrentTrainingError,
  selectCurrentTrainingIsLoading,
} from 'src/app/store/training/training.selectors';
import { Button } from '../../shared/button/button';
import { InputText } from '../../shared/input-text/input-text';
import { Icon } from 'src/app/shared/icon/icon';

@Component({
  selector: 'app-admin-training-connection-popup',
  standalone: true,
  imports: [Button, InputText, Icon],
  templateUrl: './admin-training-connection-popup.html',
  styleUrl: './admin-training-connection-popup.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminTrainingConnectionPopupComponent {
  private readonly store = inject(Store);
  private readonly dialogRef = inject(DialogRef<{ trainingCode: string; password: string }>);

  //------
  readonly trainingCode = signal('');
  readonly password = signal('');
  //------
  readonly isUnknownTraining = signal(false);

  readonly canConnect = computed(
    () => this.trainingCode().trim().length > 0 && this.password().trim().length > 0,
  );

  // Selectors for training state
  readonly trainingData = this.store.selectSignal(selectCurrentTrainingData);
  readonly trainingError = this.store.selectSignal(selectCurrentTrainingError);
  readonly trainingLoading = this.store.selectSignal(selectCurrentTrainingIsLoading);
  readonly trainingAdminInformations = this.store.selectSignal(
    selectCurrentTrainingAdminInformations,
  );

  constructor() {
    this.store.dispatch(resetTraining());
    this.isUnknownTraining.set(false);

    // Listen to training state changes
    effect(() => {
      const isLoading = this.trainingLoading();
      const data = this.trainingData();
      const error = this.trainingError();
      const adminInformations = this.trainingAdminInformations();

      // If training is loaded successfully
      if (!isLoading && !!data && !error && !!adminInformations) {
        this.dialogRef.close({
          trainingCode: data.code,
          password: this.password(),
        });
      }
      // If there's an error loading the training
      else if (!isLoading && error) {
        this.isUnknownTraining.set(true);
      }
    });
  }

  onTrainingCodeInput(value: string): void {
    this.trainingCode.set(value.trimStart().toUpperCase());
  }

  onPasswordChange(value: string): void {
    this.password.set(value);
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onConnect(): void {
    if (this.canConnect()) {
      this.isUnknownTraining.set(false);
      this.store.dispatch(
        connectTrainingAdministrator({
          code: this.trainingCode().trim(),
          password: this.password().trim(),
        }),
      );
    }
  }
}
