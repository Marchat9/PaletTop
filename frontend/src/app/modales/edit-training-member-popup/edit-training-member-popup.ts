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
import { renameTrainingMember } from 'src/app/store/training/training.admin.actions';
import { TrainingMemberDto } from 'src/app/store/training/training.models';
import {
  selectRenameTrainingMemberError,
  selectRenameTrainingMemberLoading,
} from 'src/app/store/training/training.selectors';
import { Button } from 'src/app/shared/button/button';
import { Icon } from 'src/app/shared/icon/icon';
import { InputText } from 'src/app/shared/input-text/input-text';

export interface EditTrainingMemberPopupData {
  trainingCode: string;
  member: TrainingMemberDto;
}

/** `remove`: the admin asked to remove the member, the page takes over with its confirmation. */
export type EditTrainingMemberPopupResult = 'remove';

@Component({
  selector: 'app-edit-training-member-popup',
  standalone: true,
  imports: [Button, InputText, Icon],
  templateUrl: './edit-training-member-popup.html',
  styleUrl: './edit-training-member-popup.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EditTrainingMemberPopup {
  private readonly store = inject(Store);
  private readonly dialogRef = inject(DialogRef<EditTrainingMemberPopupResult>);
  private readonly data = inject<EditTrainingMemberPopupData>(DIALOG_DATA);

  public readonly name = signal(this.data.member.name);

  public readonly loading = this.store.selectSignal(selectRenameTrainingMemberLoading);
  private readonly error = this.store.selectSignal(selectRenameTrainingMemberError);
  private readonly hasSubmitted = signal(false);

  // Only the error of a rename made from this popup: a previous failure must not greet the admin.
  public readonly visibleError = computed(() => (this.hasSubmitted() ? this.error() : null));

  public readonly canSubmit = computed(() => {
    const name = this.name().trim();
    return name.length > 0 && name !== this.data.member.name;
  });

  constructor() {
    // Close once the rename triggered here has gone through without error.
    effect(() => {
      if (this.hasSubmitted() && !this.loading() && !this.error()) {
        this.dialogRef.close();
      }
    });
  }

  public onNameChange(value: string): void {
    this.name.set(value);
  }

  public onCancel(): void {
    this.dialogRef.close();
  }

  public onRemove(): void {
    this.dialogRef.close('remove');
  }

  public onSubmit(): void {
    if (!this.canSubmit() || this.loading()) {
      return;
    }
    this.hasSubmitted.set(true);
    this.store.dispatch(
      renameTrainingMember({
        code: this.data.trainingCode,
        memberId: this.data.member.id,
        name: this.name().trim(),
      }),
    );
  }
}
