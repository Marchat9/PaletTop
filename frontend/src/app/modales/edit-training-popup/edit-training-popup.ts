import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { Store } from '@ngrx/store';
import { updateTrainingAdministratorInformations } from 'src/app/store/training/training.admin.actions';
import {
  selectUpdateTrainingError,
  selectUpdateTrainingLoading,
} from 'src/app/store/training/training.selectors';
import { Button } from 'src/app/shared/button/button';
import { Icon } from 'src/app/shared/icon/icon';
import { InputText } from 'src/app/shared/input-text/input-text';

export interface EditTrainingPopupData {
  code: string;
  name: string;
  description?: string;
}

@Component({
  selector: 'app-edit-training-popup',
  standalone: true,
  imports: [Button, InputText, Icon],
  templateUrl: './edit-training-popup.html',
  styleUrl: './edit-training-popup.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EditTrainingPopup {
  private readonly store = inject(Store);
  private readonly dialogRef = inject(DialogRef<void>);
  private readonly data = inject<EditTrainingPopupData>(DIALOG_DATA);

  public readonly code = this.data.code;
  public readonly name = signal(this.data.name);
  public readonly description = signal(this.data.description ?? '');

  public readonly loading = this.store.selectSignal(selectUpdateTrainingLoading);
  public readonly error = this.store.selectSignal(selectUpdateTrainingError);

  public readonly canSubmit = computed(() => this.name().trim().length > 0);

  private hasSubmitted = false;

  constructor() {
    // Close once the update the admin triggered here has gone through without error.
    effect(() => {
      if (this.hasSubmitted && !this.loading() && !this.error()) {
        this.dialogRef.close();
      }
    });
  }

  public onNameChange(value: string): void {
    this.name.set(value);
  }

  public onDescriptionChange(value: string): void {
    this.description.set(value);
  }

  public onCancel(): void {
    this.dialogRef.close();
  }

  public onSubmit(): void {
    if (!this.canSubmit()) {
      return;
    }
    this.hasSubmitted = true;
    this.store.dispatch(
      updateTrainingAdministratorInformations({
        code: this.code,
        name: this.name().trim(),
        description: this.description().trim() || undefined,
      }),
    );
  }
}
