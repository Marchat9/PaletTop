import { Dialog } from '@angular/cdk/dialog';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  OnInit,
  signal,
  DestroyRef,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import {
  ConfirmationData,
  ConfirmationPopupComponent,
} from 'src/app/modales/confirmation-popup/confirmation-popup';
import { disconnectTrainingAdministrator } from 'src/app/store/training/training.actions';
import {
  addTrainingMember,
  connectTrainingAdministrator,
  removeTrainingMember,
} from 'src/app/store/training/training.admin.actions';
import { loadTrainingSessions } from 'src/app/store/training/training.session.actions';
import {
  selectAddTrainingMemberLoading,
  selectCurrentTrainingAdminInformations,
  selectCurrentTrainingData,
  selectCurrentTrainingIsLoading,
  selectTrainingSessions,
  selectTrainingSessionsIsLoading,
} from 'src/app/store/training/training.selectors';
import { TrainingMemberDto } from 'src/app/store/training/training.models';
import { TrainingHeader } from './components/training-header/training-header';
import { TrainingRosterCard } from './components/training-roster-card/training-roster-card';
import { TrainingSessionList } from './components/training-session-list/training-session-list';

@Component({
  selector: 'app-admin-training-page',
  imports: [TrainingHeader, TrainingSessionList, TrainingRosterCard],
  templateUrl: './admin-training-page.html',
  styleUrl: './admin-training-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminTrainingPage implements OnInit {
  private readonly activatedRoute = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);
  private readonly store = inject(Store);
  private readonly dialog = inject(Dialog);

  public readonly trainingCode = signal<string | null>(null);

  // Plain non-reactive field: a guard living in a signal would re-run the effect.
  private sessionsRequestedFor: string | null = null;

  // Selects
  public readonly training = this.store.selectSignal(selectCurrentTrainingData);
  public readonly sessions = this.store.selectSignal(selectTrainingSessions);
  public readonly sessionsLoading = this.store.selectSignal(selectTrainingSessionsIsLoading);
  public readonly addMemberLoading = this.store.selectSignal(selectAddTrainingMemberLoading);
  private readonly adminSession = this.store.selectSignal(selectCurrentTrainingAdminInformations);
  private readonly trainingIsLoading = this.store.selectSignal(selectCurrentTrainingIsLoading);

  // Compute
  public readonly trainingLoading = computed(() => !this.training() && this.trainingIsLoading());
  private readonly adminPassword = computed(() => this.adminSession()?.password ?? null);
  // Sessions arrive from the oldest to the most recent: the last row is the most recent one.
  public readonly lastSessionDate = computed(() => this.sessions().at(-1)?.date ?? null);

  constructor() {
    // Connects as soon as the code from the URL and the stored password are both known.
    effect(() => {
      const code = this.trainingCode();
      const password = this.adminPassword();
      const currentTrainingCode = this.training()?.code;

      if (!code || !password || currentTrainingCode === code) {
        return;
      }

      this.store.dispatch(connectTrainingAdministrator({ code, password }));
    });

    // With no data and no loading in flight, the admin session is lost.
    effect(() => {
      if (!this.training() && !this.trainingLoading()) {
        this.reconnectAsAdmin();
      }
    });

    // Sessions do not come with the group: a dedicated call is needed once connected. The guard
    // avoids replaying the call every time the group is replaced in memory, which happens after
    // each member added or removed.
    effect(() => {
      const code = this.training()?.code;
      if (!code || this.sessionsRequestedFor === code) {
        return;
      }

      this.sessionsRequestedFor = code;
      this.store.dispatch(loadTrainingSessions({ trainingCode: code }));
    });
  }

  ngOnInit(): void {
    this.activatedRoute.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const code = params.get('trainingCode');
      if (code) {
        this.trainingCode.set(code);
      } else {
        this.reconnectAsAdmin();
      }
    });
  }

  // ========= Actions =========

  public disconnect(): void {
    this.store.dispatch(disconnectTrainingAdministrator());
    this.router.navigate(['/accueil']);
  }

  private reconnectAsAdmin(): void {
    this.store.dispatch(disconnectTrainingAdministrator());
    this.router.navigate(['/admin/training']);
  }

  public openSession(sessionCode: string): void {
    const trainingCode = this.training()?.code;
    if (!trainingCode) {
      return;
    }
    this.router.navigate([`/admin/training/${trainingCode}/session/${sessionCode}`]);
  }

  public createSession(): void {
    const trainingCode = this.training()?.code;
    if (!trainingCode) {
      return;
    }
    this.router.navigate([`/admin/training/${trainingCode}/session-creation`]);
  }

  public addMember(name: string): void {
    const code = this.training()?.code;
    if (!code) {
      return;
    }
    this.store.dispatch(addTrainingMember({ code, name }));
  }

  public removeMember(member: TrainingMemberDto): void {
    const code = this.training()?.code;
    if (!code) {
      return;
    }

    const data: ConfirmationData = {
      title: 'Retirer le membre',
      message: `${member.name} sera retiré(e) du roster du club. Les séances déjà jouées ne sont pas modifiées.`,
      confirmLabel: 'Retirer',
    };

    this.dialog
      .open<boolean, ConfirmationData>(ConfirmationPopupComponent, {
        data,
        panelClass: 'dialog-panel',
        backdropClass: 'dialog-backdrop-light',
        disableClose: false,
      })
      .closed.subscribe((confirmed) => {
        if (confirmed) {
          this.store.dispatch(removeTrainingMember({ code, memberId: member.id }));
        }
      });
  }
}
