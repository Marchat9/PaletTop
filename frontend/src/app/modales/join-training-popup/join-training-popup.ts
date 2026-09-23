import { DialogRef } from '@angular/cdk/dialog';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { Store } from '@ngrx/store';
import { Button } from 'src/app/shared/button/button';
import { CodeNumberInputComponent } from 'src/app/shared/code-number-input/code-number-input';
import { Icon } from 'src/app/shared/icon/icon';

@Component({
  selector: 'app-join-training-popup',
  imports: [Button, CodeNumberInputComponent, Icon],
  templateUrl: './join-training-popup.html',
  styleUrl: './join-training-popup.scss',
})
export class JoinTrainingPopup {

  private readonly store = inject(Store);
  private readonly dialogRef = inject(DialogRef<{ sessionCode: string; participantCode: string }>);

  //------
  readonly sessionCode = signal('');
  private readonly participantCode = signal('');
  //------
  readonly isUnknownSession = signal(false);

  readonly isCodeComplete = computed(() => this.participantCode().length === 4);
  readonly canJoin = computed(
    () => this.sessionCode().trim().length > 0 && this.isCodeComplete(),
  );

  // Selectors for tournament state
  // readonly trainingData = this.store.selectSignal(selectCurrentTournamentData);
  // readonly trainingError = this.store.selectSignal(selectCurrentTournamentError);
  // readonly trainingLoading = this.store.selectSignal(selectCurrentTournamentIsLoading);
  readonly trainingLoading = signal(false);

  constructor() {
    // this.store.dispatch(resetTraining());
    this.isUnknownSession.set(false);

    // Listen to tournament state changes
    effect(() => {
      // const isLoading = this.trainingLoading();
      // const data = this.trainingData();
      // const error = this.trainingError();

      // // If training is loaded successfully
      // if (!isLoading && data && !error) {
      //   this.dialogRef.close({
      //     sessionCode: data.code,
      //     participantCode: this.participantCode(),
      //   });
      // }
      // // If there's an error loading the tournament
      // else if (!isLoading && error) {
      //   this.isUnknownSession.set(true);
      // }
    });
  }

  onSessionCodeChange(code: string): void {
    this.sessionCode.set(code);
  }

  onCodeChange(code: string): void {
    this.participantCode.set(code);
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onJoin(): void {
    if (this.canJoin()) {
      this.isUnknownSession.set(false);
      // this.store.dispatch(
      //   loadTrainingInformation({
      //     tournamentCode: this.sessionCode().trim(),
      //     teamCode: this.participantCode(),
      //   }),
      // );
    }
  }
}
