import { Dialog, DialogRef, DIALOG_DATA } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Store } from '@ngrx/store';
import { AnimateOnChangeDirective } from 'src/app/shared/animate-on-change/animate-on-change.directive';
import { Button } from 'src/app/shared/button/button';
import { Icon } from 'src/app/shared/icon/icon';
import { InputText } from 'src/app/shared/input-text/input-text';
import {
  checkinTrainingParticipant,
  dismissTrainingCheckinHandoff,
  removeTrainingParticipant,
} from 'src/app/store/training/training.session.actions';
import {
  selectCheckinTrainingParticipantLoading,
  selectCurrentTrainingData,
  selectCurrentTrainingSessionData,
  selectLastCheckedInTrainingParticipant,
  selectRemoveTrainingParticipantLoading,
} from 'src/app/store/training/training.selectors';
import { TrainingParticipantAdminDto } from 'src/app/store/training/training.models';

export interface TrainingCheckinPopupData {
  sessionCode: string;
}

/**
 * - `present`: in the session; clicking again removes them (a mis-click is undone on the spot).
 * - `left`: has left, one click brings them back.
 * - `absent`: has not come to the session yet.
 */
export type CheckinEntryState = 'present' | 'left' | 'absent';

export interface CheckinEntry {
  key: string;
  name: string;
  state: CheckinEntryState;
}

@Component({
  selector: 'app-training-checkin-popup',
  imports: [Button, Icon, InputText, AnimateOnChangeDirective],
  templateUrl: './training-checkin-popup.html',
  styleUrl: './training-checkin-popup.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TrainingCheckinPopup {
  private readonly store = inject(Store);
  private readonly dialogRef = inject(DialogRef<void>);
  private readonly data = inject<TrainingCheckinPopupData>(DIALOG_DATA);

  // Selects
  private readonly training = this.store.selectSignal(selectCurrentTrainingData);
  private readonly session = this.store.selectSignal(selectCurrentTrainingSessionData);
  private readonly checkinLoading = this.store.selectSignal(
    selectCheckinTrainingParticipantLoading,
  );
  private readonly removeLoading = this.store.selectSignal(selectRemoveTrainingParticipantLoading);
  /** A check-in or a removal is in flight: the pills wait rather than stacking clicks. */
  public readonly loading = computed(() => this.checkinLoading() || this.removeLoading());
  public readonly lastCheckedIn = this.store.selectSignal(selectLastCheckedInTrainingParticipant);

  public readonly guestName = signal('');
  public readonly canAddGuest = computed(() => this.guestName().trim().length > 0);

  private readonly participants = computed<TrainingParticipantAdminDto[]>(() => {
    const session = this.session();
    return session ? (session.participants as TrainingParticipantAdminDto[]) : [];
  });

  /** The whole roster stays on screen: present members change look instead of disappearing. */
  public readonly memberEntries = computed<CheckinEntry[]>(() =>
    (this.training()?.members ?? []).map((member) => {
      const linked = this.participants().filter(
        (participant) => participant.memberId === member.id,
      );
      return {
        key: member.id,
        name: member.name,
        state: this.resolveState(linked),
      };
    }),
  );

  /**
   * Drop-in players only exist through their check-in: they are grouped by name so that a round
   * trip does not produce two pills for the same person.
   */
  public readonly guestEntries = computed<CheckinEntry[]>(() => {
    const guestsByName = new Map<string, TrainingParticipantAdminDto[]>();

    for (const participant of this.participants()) {
      if (participant.memberId) {
        continue;
      }
      guestsByName.set(participant.name, [
        ...(guestsByName.get(participant.name) ?? []),
        participant,
      ]);
    }

    return [...guestsByName.entries()].map(([name, linked]) => ({
      key: name,
      name,
      state: this.resolveState(linked),
    }));
  });

  public readonly presentCount = computed(
    () => this.participants().filter((participant) => participant.status === 'PRESENT').length,
  );

  private resolveState(linked: TrainingParticipantAdminDto[]): CheckinEntryState {
    if (linked.some((participant) => participant.status === 'PRESENT')) {
      return 'present';
    }
    return linked.length > 0 ? 'left' : 'absent';
  }

  public onMemberClick(entry: CheckinEntry): void {
    if (entry.state === 'present') {
      this.removePresent((participant) => participant.memberId === entry.key);
      return;
    }
    this.store.dispatch(
      checkinTrainingParticipant({ sessionCode: this.data.sessionCode, memberId: entry.key }),
    );
  }

  public onGuestClick(entry: CheckinEntry): void {
    if (entry.state === 'present') {
      this.removePresent((participant) => !participant.memberId && participant.name === entry.key);
      return;
    }
    this.store.dispatch(
      checkinTrainingParticipant({ sessionCode: this.data.sessionCode, name: entry.name }),
    );
  }

  /** Undo a check-in: take the matching present participant back out of the session. */
  private removePresent(matches: (participant: TrainingParticipantAdminDto) => boolean): void {
    const participant = this.participants().find(
      (candidate) => candidate.status === 'PRESENT' && matches(candidate),
    );
    if (!participant) {
      return;
    }
    this.store.dispatch(
      removeTrainingParticipant({
        sessionCode: this.data.sessionCode,
        participantId: participant.id,
      }),
    );
  }

  public onGuestNameChange(value: string): void {
    this.guestName.set(value);
  }

  public onAddGuest(): void {
    if (!this.canAddGuest()) {
      return;
    }
    this.store.dispatch(
      checkinTrainingParticipant({
        sessionCode: this.data.sessionCode,
        name: this.guestName().trim(),
      }),
    );
    this.guestName.set('');
  }

  public dismissHandoff(): void {
    this.store.dispatch(dismissTrainingCheckinHandoff());
  }

  public close(): void {
    this.store.dispatch(dismissTrainingCheckinHandoff());
    this.dialogRef.close();
  }
}
