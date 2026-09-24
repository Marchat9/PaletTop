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
import { Button } from 'src/app/shared/button/button';
import { CodeNumberInputComponent } from 'src/app/shared/code-number-input/code-number-input';
import { Icon } from 'src/app/shared/icon/icon';
import {
  loadTrainingParticipantCurrentMatch,
  resetTraining,
} from 'src/app/store/training/training.actions';
import {
  selectTrainingParticipantCurrentMatch,
  selectTrainingParticipantCurrentMatchError,
  selectTrainingParticipantCurrentMatchIsLoading,
} from 'src/app/store/training/training.selectors';

@Component({
  selector: 'app-join-training-popup',
  imports: [Button, CodeNumberInputComponent, Icon],
  templateUrl: './join-training-popup.html',
  styleUrl: './join-training-popup.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
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
  readonly canJoin = computed(() => this.sessionCode().trim().length > 0 && this.isCodeComplete());

  // Selectors for training participant view state
  readonly currentMatch = this.store.selectSignal(selectTrainingParticipantCurrentMatch);
  readonly trainingError = this.store.selectSignal(selectTrainingParticipantCurrentMatchError);
  readonly trainingLoading = this.store.selectSignal(
    selectTrainingParticipantCurrentMatchIsLoading,
  );

  constructor() {
    this.store.dispatch(resetTraining());
    this.isUnknownSession.set(false);

    // Listen to training participant view state changes
    effect(() => {
      const isLoading = this.trainingLoading();
      const data = this.currentMatch();
      const error = this.trainingError();

      // If the session/participant code pair is valid
      if (!isLoading && data && !error) {
        this.dialogRef.close({
          sessionCode: this.sessionCode().trim(),
          participantCode: this.participantCode(),
        });
      }
      // If there's an error loading the training session
      else if (!isLoading && error) {
        this.isUnknownSession.set(true);
      }
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
      this.store.dispatch(
        loadTrainingParticipantCurrentMatch({
          sessionCode: this.sessionCode().trim(),
          participantCode: this.participantCode(),
        }),
      );
    }
  }
}
