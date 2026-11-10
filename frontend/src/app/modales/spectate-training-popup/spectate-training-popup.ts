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
import { loadTrainingSessionPublic } from 'src/app/store/training/training.session.actions';
import {
  selectCurrentTrainingSessionData,
  selectCurrentTrainingSessionError,
  selectCurrentTrainingSessionIsLoading,
} from 'src/app/store/training/training.selectors';
import { isSpectatorSessionCode, SESSION_CODE_LENGTH } from 'src/app/utils/code-format.util';

/** Asks for the 6-digit code of a training session to follow it as a spectator. */
@Component({
  selector: 'app-spectate-training-popup',
  imports: [Button, CodeNumberInputComponent, Icon],
  templateUrl: './spectate-training-popup.html',
  styleUrl: './spectate-training-popup.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SpectateTrainingPopup {
  private readonly store = inject(Store);
  private readonly dialogRef = inject(DialogRef<{ sessionCode: string }>);

  readonly sessionCodeLength = SESSION_CODE_LENGTH;
  readonly sessionCode = signal('');
  /** Code sent to the server: the session in the store only answers it once it carries this code. */
  private readonly requestedCode = signal<string | null>(null);
  readonly isUnknownSession = signal(false);

  readonly canJoin = computed(() => isSpectatorSessionCode(this.sessionCode()));

  private readonly session = this.store.selectSignal(selectCurrentTrainingSessionData);
  private readonly sessionError = this.store.selectSignal(selectCurrentTrainingSessionError);
  readonly sessionLoading = this.store.selectSignal(selectCurrentTrainingSessionIsLoading);

  constructor() {
    effect(() => {
      const requested = this.requestedCode();
      if (!requested || this.sessionLoading()) {
        return;
      }
      if (this.sessionError()) {
        this.isUnknownSession.set(true);
      } else if (this.session()?.code === requested) {
        this.dialogRef.close({ sessionCode: requested });
      }
    });
  }

  onSessionCodeChange(code: string): void {
    this.sessionCode.set(code);
    this.isUnknownSession.set(false);
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onJoin(): void {
    if (!this.canJoin()) {
      return;
    }
    const sessionCode = this.sessionCode();
    this.isUnknownSession.set(false);
    this.requestedCode.set(sessionCode);
    this.store.dispatch(loadTrainingSessionPublic({ sessionCode }));
  }
}
