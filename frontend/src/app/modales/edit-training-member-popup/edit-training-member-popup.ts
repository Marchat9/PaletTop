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
import {
  renameTrainingMember,
  setTrainingAdminMember,
} from 'src/app/store/training/training.admin.actions';
import { TrainingMemberDto } from 'src/app/store/training/training.models';
import {
  selectRenameTrainingMemberError,
  selectRenameTrainingMemberLoading,
  selectSetTrainingAdminMemberError,
  selectSetTrainingAdminMemberLoading,
} from 'src/app/store/training/training.selectors';
import { Button } from 'src/app/shared/button/button';
import { Icon } from 'src/app/shared/icon/icon';
import { InputText } from 'src/app/shared/input-text/input-text';
import { Switch } from 'src/app/shared/switch/switch';

export interface EditTrainingMemberPopupData {
  trainingCode: string;
  member: TrainingMemberDto;
  /** This member is the admin who also plays. */
  isAdminPlayer: boolean;
}

/** `remove`: the admin asked to remove the member, the page takes over with its confirmation. */
export type EditTrainingMemberPopupResult = 'remove';

@Component({
  selector: 'app-edit-training-member-popup',
  standalone: true,
  imports: [Button, InputText, Icon, Switch],
  templateUrl: './edit-training-member-popup.html',
  styleUrl: './edit-training-member-popup.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EditTrainingMemberPopup {
  private readonly store = inject(Store);
  private readonly dialogRef = inject(DialogRef<EditTrainingMemberPopupResult>);
  private readonly data = inject<EditTrainingMemberPopupData>(DIALOG_DATA);

  public readonly name = signal(this.data.member.name);
  // Saved with the name on "Enregistrer": "Annuler" leaves both untouched.
  public readonly isAdminPlayer = signal(this.data.isAdminPlayer);

  private readonly renameLoading = this.store.selectSignal(selectRenameTrainingMemberLoading);
  private readonly renameError = this.store.selectSignal(selectRenameTrainingMemberError);
  private readonly adminLoading = this.store.selectSignal(selectSetTrainingAdminMemberLoading);
  private readonly adminError = this.store.selectSignal(selectSetTrainingAdminMemberError);

  // What the last "Enregistrer" sent: only those requests count for the error and the closing.
  private readonly submitted = signal<{ rename: boolean; admin: boolean } | null>(null);

  private readonly nameChanged = computed(() => {
    const name = this.name().trim();
    return name.length > 0 && name !== this.data.member.name;
  });
  private readonly adminChanged = computed(() => this.isAdminPlayer() !== this.data.isAdminPlayer);

  public readonly loading = computed(
    () =>
      (!!this.submitted()?.rename && this.renameLoading()) ||
      (!!this.submitted()?.admin && this.adminLoading()),
  );
  // Only the errors of what was sent from this popup: a previous failure must not greet the admin.
  public readonly visibleError = computed(
    () =>
      (this.submitted()?.rename ? this.renameError() : null) ??
      (this.submitted()?.admin ? this.adminError() : null),
  );

  public readonly canSubmit = computed(
    () => this.name().trim().length > 0 && (this.nameChanged() || this.adminChanged()),
  );

  constructor() {
    // Close once everything sent from here has gone through without error.
    effect(() => {
      if (this.submitted() && !this.loading() && !this.visibleError()) {
        this.dialogRef.close();
      }
    });
  }

  public onNameChange(value: string): void {
    this.name.set(value);
  }

  public onAdminPlayerChange(checked: boolean): void {
    this.isAdminPlayer.set(checked);
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
    const rename = this.nameChanged();
    const admin = this.adminChanged();
    this.submitted.set({ rename, admin });

    const { trainingCode: code, member } = this.data;
    if (rename) {
      this.store.dispatch(
        renameTrainingMember({ code, memberId: member.id, name: this.name().trim() }),
      );
    }
    if (admin) {
      this.store.dispatch(
        setTrainingAdminMember({ code, memberId: this.isAdminPlayer() ? member.id : null }),
      );
    }
  }
}
