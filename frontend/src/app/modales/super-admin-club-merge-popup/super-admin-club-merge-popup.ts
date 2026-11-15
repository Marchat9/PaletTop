import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { Store } from '@ngrx/store';
import { SuperAdminClubSummaryDto } from 'src/app/services/super-admin-club.service';
import { Button } from 'src/app/shared/button/button';
import { Icon } from 'src/app/shared/icon/icon';
import { InputRadio, InputRadioOption } from 'src/app/shared/input-radio/input-radio';
import { InputText } from 'src/app/shared/input-text/input-text';
import { mergeSuperAdminClubs } from 'src/app/store/superadmin-clubs/superadmin-clubs.actions';
import { selectSuperAdminClubMergeRequest } from 'src/app/store/superadmin-clubs/superadmin-clubs.selectors';

export interface ClubMergePopupData {
  first: SuperAdminClubSummaryDto;
  second: SuperAdminClubSummaryDto;
}

@Component({
  selector: 'app-super-admin-club-merge-popup',
  imports: [Button, Icon, InputRadio, InputText],
  templateUrl: './super-admin-club-merge-popup.html',
  styleUrl: './super-admin-club-merge-popup.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SuperAdminClubMergePopupComponent {
  private readonly store = inject(Store);
  readonly dialogRef = inject(DialogRef<boolean>);
  readonly data = inject<ClubMergePopupData>(DIALOG_DATA);

  readonly keptOptions: readonly InputRadioOption[] = [this.data.first, this.data.second].map(
    (club) => ({ value: club.id, label: `${club.name} (${club.playersCount} joueur(s))` }),
  );

  readonly keptId = signal(this.data.first.id);
  readonly newName = signal('');

  readonly kept = computed(() =>
    this.keptId() === this.data.second.id ? this.data.second : this.data.first,
  );
  readonly merged = computed(() =>
    this.keptId() === this.data.second.id ? this.data.first : this.data.second,
  );
  readonly finalName = computed(() => this.newName().trim() || this.kept().name);

  readonly request = this.store.selectSignal(selectSuperAdminClubMergeRequest);
  private readonly hasSubmitted = signal(false);
  // Hides an error left in the store by a previous merge until this popup submits.
  readonly error = computed(() => (this.hasSubmitted() ? this.request().error : null));

  constructor() {
    // Closes once the request this popup started settles without error; hasSubmitted is read
    // untracked so that submitting does not close the popup before the request even starts.
    effect(() => {
      const request = this.request();
      if (!request.isLoading && !request.error && untracked(this.hasSubmitted)) {
        this.dialogRef.close(true);
      }
    });
  }

  onKeptChange(id: string): void {
    this.keptId.set(id);
  }

  onNewNameChange(value: string): void {
    this.newName.set(value);
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onConfirm(): void {
    if (this.request().isLoading) return;
    this.hasSubmitted.set(true);
    const newName = this.newName().trim();
    this.store.dispatch(
      mergeSuperAdminClubs({
        targetId: this.kept().id,
        sourceId: this.merged().id,
        ...(newName ? { newName } : {}),
      }),
    );
  }
}
