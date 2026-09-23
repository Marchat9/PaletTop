import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { disconnectTrainingAdministrator } from 'src/app/store/training/training.actions';
import {
  addTrainingMember,
  connectTrainingAdministrator,
  removeTrainingMember,
  updateTrainingAdministratorInformations,
} from 'src/app/store/training/training.admin.actions';
import { adminUpdateTrainingScore } from 'src/app/store/training/training.match.actions';
import {
  generateTrainingRound,
  loadTrainingRound,
  loadTrainingRounds,
} from 'src/app/store/training/training.round.actions';
import {
  checkinTrainingParticipant,
  closeTrainingSession,
  connectTrainingSessionAdministrator,
  createTrainingSession,
  loadTrainingLeaderboard,
  loadTrainingSessions,
  removeTrainingParticipant,
} from 'src/app/store/training/training.session.actions';
import {
  selectAddTrainingMemberLoading,
  selectCheckinTrainingParticipantLoading,
  selectCloseTrainingSessionLoading,
  selectCreateTrainingSessionLoading,
  selectCreateTrainingTeamLoading,
  selectCurrentTrainingAdminInformations,
  selectCurrentTrainingData,
  selectCurrentTrainingIsLoading,
  selectCurrentTrainingRound,
  selectCurrentTrainingSessionData,
  selectCurrentTrainingSessionIsLoading,
  selectDissolveTrainingTeamLoading,
  selectGenerateTrainingRoundLoading,
  selectRemoveTrainingMemberLoading,
  selectRemoveTrainingParticipantLoading,
  selectTrainingLeaderboard,
  selectTrainingRounds,
  selectTrainingSessions,
  selectTrainingSessionsIsLoading,
  selectUpdateTrainingLoading,
} from 'src/app/store/training/training.selectors';
import {
  createTrainingTeam,
  dissolveTrainingTeam,
} from 'src/app/store/training/training.team.actions';

@Component({
  selector: 'app-admin-training-page',
  imports: [CommonModule],
  templateUrl: './admin-training-page.html',
  styleUrl: './admin-training-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminTrainingPage implements OnInit {
  private readonly activatedRoute = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly store = inject(Store);

  public readonly trainingCode = signal<string | null>(null);
  public readonly selectedSessionCode = signal<string | null>(null);

  // Data
  public readonly training = this.store.selectSignal(selectCurrentTrainingData);
  private readonly adminSession = this.store.selectSignal(selectCurrentTrainingAdminInformations);
  public readonly sessions = this.store.selectSignal(selectTrainingSessions);
  public readonly currentSession = this.store.selectSignal(selectCurrentTrainingSessionData);
  public readonly rounds = this.store.selectSignal(selectTrainingRounds);
  public readonly currentRound = this.store.selectSignal(selectCurrentTrainingRound);
  public readonly leaderboard = this.store.selectSignal(selectTrainingLeaderboard);

  // Loadings
  public readonly trainingLoading = computed(
    () => !this.training() && this.store.selectSignal(selectCurrentTrainingIsLoading)(),
  );
  public readonly sessionsLoading = this.store.selectSignal(selectTrainingSessionsIsLoading);
  public readonly currentSessionLoading = this.store.selectSignal(
    selectCurrentTrainingSessionIsLoading,
  );
  public readonly updateTrainingLoading = this.store.selectSignal(selectUpdateTrainingLoading);
  public readonly addMemberLoading = this.store.selectSignal(selectAddTrainingMemberLoading);
  public readonly removeMemberLoading = this.store.selectSignal(selectRemoveTrainingMemberLoading);
  public readonly createSessionLoading = this.store.selectSignal(
    selectCreateTrainingSessionLoading,
  );
  public readonly closeSessionLoading = this.store.selectSignal(selectCloseTrainingSessionLoading);
  public readonly checkinLoading = this.store.selectSignal(selectCheckinTrainingParticipantLoading);
  public readonly removeParticipantLoading = this.store.selectSignal(
    selectRemoveTrainingParticipantLoading,
  );
  public readonly createTeamLoading = this.store.selectSignal(selectCreateTrainingTeamLoading);
  public readonly dissolveTeamLoading = this.store.selectSignal(selectDissolveTrainingTeamLoading);
  public readonly generateRoundLoading = this.store.selectSignal(
    selectGenerateTrainingRoundLoading,
  );

  // Compute
  public readonly adminPassword = computed(() => this.adminSession()?.password ?? null);

  constructor() {
    // Try to connect when code / password change.
    effect(() => {
      const code = this.trainingCode();
      const password = this.adminPassword();
      const currentTrainingCode = this.training()?.code;

      if (!code || !password || currentTrainingCode === code) {
        return;
      }

      this.store.dispatch(connectTrainingAdministrator({ code, password }));
    });

    // Check if all required data are present or redirect to admin login page
    effect(() => {
      if (!this.training() && !this.trainingLoading()) {
        this.reconnectAsAdmin();
      }
    });

    // Load sessions once the training roster is connected
    effect(() => {
      const code = this.training()?.code;
      if (code) {
        this.store.dispatch(loadTrainingSessions({ trainingCode: code }));
      }
    });
  }

  ngOnInit(): void {
    this.activatedRoute.paramMap.subscribe((params) => {
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
    this.router.navigate(['/home']);
  }

  private reconnectAsAdmin(): void {
    this.store.dispatch(disconnectTrainingAdministrator());
    this.router.navigate(['/admin/training']);
  }

  public updateTrainingInformations(name?: string, club?: string): void {
    const code = this.training()?.code;
    if (!code) {
      console.debug('Cannot update training informations: training code is missing');
      return;
    }
    this.store.dispatch(updateTrainingAdministratorInformations({ code, name, club }));
  }

  public addMember(name: string): void {
    const code = this.training()?.code;
    if (!code) {
      console.debug('Cannot add member: training code is missing');
      return;
    }
    this.store.dispatch(addTrainingMember({ code, name }));
  }

  public removeMember(memberId: string): void {
    const code = this.training()?.code;
    if (!code) {
      console.debug('Cannot remove member: training code is missing');
      return;
    }
    this.store.dispatch(removeTrainingMember({ code, memberId }));
  }

  public createSession(payload: {
    date: Date;
    playersPerTeam: number;
    fallbackTeamSize: number;
    allowSitOut: boolean;
    avoidSamePartnerConsecutive: boolean;
    avoidSameOpponentConsecutive: boolean;
    pointsPerGame: number;
  }): void {
    const trainingCode = this.training()?.code;
    if (!trainingCode) {
      console.debug('Cannot create session: training code is missing');
      return;
    }
    this.store.dispatch(createTrainingSession({ trainingCode, ...payload }));
  }

  public selectSession(sessionCode: string): void {
    this.selectedSessionCode.set(sessionCode);
    this.store.dispatch(connectTrainingSessionAdministrator({ sessionCode }));
    this.store.dispatch(loadTrainingRounds({ sessionCode }));
    this.store.dispatch(loadTrainingLeaderboard({ sessionCode }));
  }

  public closeSession(): void {
    const sessionCode = this.selectedSessionCode();
    if (!sessionCode) {
      console.debug('Cannot close session: no session selected');
      return;
    }
    this.store.dispatch(closeTrainingSession({ sessionCode }));
  }

  public checkinParticipant(memberId?: string, name?: string): void {
    const sessionCode = this.selectedSessionCode();
    if (!sessionCode) {
      console.debug('Cannot checkin participant: no session selected');
      return;
    }
    this.store.dispatch(checkinTrainingParticipant({ sessionCode, memberId, name }));
  }

  public removeParticipant(participantId: string): void {
    const sessionCode = this.selectedSessionCode();
    if (!sessionCode) {
      console.debug('Cannot remove participant: no session selected');
      return;
    }
    this.store.dispatch(removeTrainingParticipant({ sessionCode, participantId }));
  }

  public createTeam(participantIds: string[], name?: string): void {
    const sessionCode = this.selectedSessionCode();
    if (!sessionCode) {
      console.debug('Cannot create team: no session selected');
      return;
    }
    this.store.dispatch(createTrainingTeam({ sessionCode, participantIds, name }));
  }

  public dissolveTeam(teamId: string): void {
    const sessionCode = this.selectedSessionCode();
    if (!sessionCode) {
      console.debug('Cannot dissolve team: no session selected');
      return;
    }
    this.store.dispatch(dissolveTrainingTeam({ sessionCode, teamId }));
  }

  public generateRound(): void {
    const sessionCode = this.selectedSessionCode();
    if (!sessionCode) {
      console.debug('Cannot generate round: no session selected');
      return;
    }
    this.store.dispatch(generateTrainingRound({ sessionCode }));
  }

  public loadRound(roundNumber: number): void {
    const sessionCode = this.selectedSessionCode();
    if (!sessionCode) {
      console.debug('Cannot load round: no session selected');
      return;
    }
    this.store.dispatch(loadTrainingRound({ sessionCode, roundNumber }));
  }

  public adminUpdateScore(matchId: string, scoreA: number, scoreB: number): void {
    const sessionCode = this.selectedSessionCode();
    if (!sessionCode) {
      console.debug('Cannot update score: no session selected');
      return;
    }
    this.store.dispatch(adminUpdateTrainingScore({ sessionCode, matchId, scoreA, scoreB }));
  }
}
