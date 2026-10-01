import { Dialog } from '@angular/cdk/dialog';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  OnDestroy,
  OnInit,
  signal,
  untracked,
  DestroyRef,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import {
  ConfirmationData,
  ConfirmationPopupComponent,
} from 'src/app/modales/confirmation-popup/confirmation-popup';
import { Icon } from 'src/app/shared/icon/icon';
import { MetricTileComponent } from 'src/app/shared/metric-tile/metric-tile';
import { AnimateOnChangeDirective } from 'src/app/shared/animate-on-change/animate-on-change.directive';
import { addNotification } from 'src/app/store/app-config/app-config.actions';
import { connectTrainingAdministrator } from 'src/app/store/training/training.admin.actions';
import { adminUpdateTrainingScore } from 'src/app/store/training/training.match.actions';
import {
  generateTrainingRound,
  loadTrainingRounds,
} from 'src/app/store/training/training.round.actions';
import {
  closeTrainingSession,
  connectTrainingSessionAdministrator,
  leaveTrainingSession,
  loadTrainingLeaderboard,
  removeTrainingParticipant,
} from 'src/app/store/training/training.session.actions';
import { onResyncRequested } from 'src/app/utils/resync-on-reconnect.util';
import {
  TrainingCheckinPopup,
  TrainingCheckinPopupData,
} from 'src/app/modales/training-checkin-popup/training-checkin-popup';
import {
  createTrainingTeam,
  dissolveTrainingTeam,
} from 'src/app/store/training/training.team.actions';
import {
  TrainingParticipantAdminDto,
  TrainingSessionAdminDto,
  TrainingTeamDto,
} from 'src/app/store/training/training.models';
import {
  selectCloseTrainingSessionLoading,
  selectCreateTrainingTeamLoading,
  selectCurrentTrainingAdminInformations,
  selectCurrentTrainingData,
  selectCurrentTrainingSessionData,
  selectCurrentTrainingSessionError,
  selectCurrentTrainingSessionIsLoading,
  selectAdminUpdateTrainingScoreLoading,
  selectGenerateTrainingRoundLoading,
  selectLastCheckedInTrainingParticipant,
  selectTrainingLeaderboard,
  selectTrainingLeaderboardIsLoading,
  selectTrainingRounds,
  selectTrainingRoundsIsLoading,
} from 'src/app/store/training/training.selectors';
import { describeRoundPreview, previewRound } from 'src/app/utils/round-preview.util';
import { TrainingScoreUpdate, TrainingTeamCreation } from './admin-training-session-page.models';
import { SessionActions } from './components/session-actions/session-actions';
import { SessionHeader } from './components/session-header/session-header';
import { SessionLeaderboard } from './components/session-leaderboard/session-leaderboard';
import { SessionParticipants } from './components/session-participants/session-participants';
import { SessionRound } from './components/session-round/session-round';
import { SessionRoundsHistory } from './components/session-rounds-history/session-rounds-history';
import { SessionTeams } from './components/session-teams/session-teams';
import { newId } from 'src/app/utils/unique-id.util';

@Component({
  selector: 'app-admin-training-session-page',
  imports: [
    Icon,
    MetricTileComponent,
    AnimateOnChangeDirective,
    SessionHeader,
    SessionActions,
    SessionRound,
    SessionParticipants,
    SessionTeams,
    SessionLeaderboard,
    SessionRoundsHistory,
  ],
  templateUrl: './admin-training-session-page.html',
  styleUrl: './admin-training-session-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminTrainingSessionPage implements OnInit, OnDestroy {
  private readonly activatedRoute = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);
  private readonly store = inject(Store);
  private readonly dialog = inject(Dialog);

  public readonly trainingCode = signal<string | null>(null);
  public readonly sessionCode = signal<string | null>(null);

  // Plain non-reactive field: a guard held by a signal would re-run the effect.
  private loadedSessionCode: string | null = null;

  // Selects
  public readonly training = this.store.selectSignal(selectCurrentTrainingData);
  public readonly sessionLoading = this.store.selectSignal(selectCurrentTrainingSessionIsLoading);
  public readonly rounds = this.store.selectSignal(selectTrainingRounds);
  public readonly roundsLoading = this.store.selectSignal(selectTrainingRoundsIsLoading);
  public readonly leaderboard = this.store.selectSignal(selectTrainingLeaderboard);
  public readonly leaderboardLoading = this.store.selectSignal(selectTrainingLeaderboardIsLoading);
  public readonly lastCheckedIn = this.store.selectSignal(selectLastCheckedInTrainingParticipant);
  public readonly createTeamLoading = this.store.selectSignal(selectCreateTrainingTeamLoading);
  public readonly generateRoundLoading = this.store.selectSignal(
    selectGenerateTrainingRoundLoading,
  );
  public readonly closeSessionLoading = this.store.selectSignal(selectCloseTrainingSessionLoading);
  public readonly scoreLoading = this.store.selectSignal(selectAdminUpdateTrainingScoreLoading);
  private readonly adminSession = this.store.selectSignal(selectCurrentTrainingAdminInformations);
  private readonly sessionError = this.store.selectSignal(selectCurrentTrainingSessionError);
  private readonly sessionData = this.store.selectSignal(selectCurrentTrainingSessionData);

  /**
   * The page only shows the admin view of a session. The store holds a single session slot, where
   * the public view may have landed (player page visited just before): it is recognised by its
   * participants having no code, and the admin response is awaited rather than showing empty codes.
   *
   * Sticky on purpose: once an admin view is on screen it stays there. A reload in flight or a
   * public payload landing in the shared slot must not empty the page - only an error, or another
   * session, does.
   */
  private readonly adminView = signal<TrainingSessionAdminDto | null>(null);
  public readonly session = this.adminView.asReadonly();

  private readonly adminPassword = computed(() => this.adminSession()?.password ?? null);
  public readonly isSessionOpen = computed(() => this.session()?.status === 'OPEN');

  public readonly presentParticipants = computed(
    () => this.session()?.participants.filter((p) => p.status === 'PRESENT') ?? [],
  );

  /** A player can only belong to one active fixed team. */
  public readonly participantsWithoutTeam = computed(() => {
    const takenIds = new Set(
      (this.session()?.teams ?? [])
        .filter((team) => team.kind === 'FIXED')
        .flatMap((team) => team.members.map((member) => member.id)),
    );
    return this.presentParticipants().filter((participant) => !takenIds.has(participant.id));
  });

  private readonly sortedRounds = computed(() =>
    [...this.rounds()].sort((a, b) => a.roundNumber - b.roundNumber),
  );
  public readonly currentRound = computed(() => this.sortedRounds().at(-1) ?? null);
  public readonly previousRounds = computed(() => this.sortedRounds().slice(0, -1).reverse());

  public readonly ongoingMatchCount = computed(
    () =>
      this.currentRound()?.matches.filter((match) => !match.isBye && match.status !== 'VALIDATED')
        .length ?? 0,
  );
  public readonly fixedTeamCount = computed(
    () => this.session()?.teams.filter((team) => team.kind === 'FIXED').length ?? 0,
  );

  /** Split settings of the session, as the preview reads them. */
  private readonly previewSettings = computed(() => {
    const session = this.session();
    return session
      ? {
          playersPerTeam: session.playersPerTeam,
          allowedTeamSizes: session.allowedTeamSizes,
          preferTargetTeamSize: session.preferTargetTeamSize,
          plateCount: session.plateCount,
        }
      : null;
  });

  /** Is there even a round to generate with the current headcount and settings? */
  private readonly hasPlayableRound = computed(() => {
    const settings = this.previewSettings();
    return !!settings && previewRound(this.presentParticipants().length, settings) !== null;
  });

  public readonly canGenerateRound = computed(
    () =>
      this.isSessionOpen() &&
      this.presentParticipants().length > 0 &&
      this.ongoingMatchCount() === 0 &&
      this.hasPlayableRound(),
  );

  /** The matches of the current round that keep the next one from starting. */
  private readonly blockingMatches = computed(
    () =>
      this.currentRound()?.matches.filter(
        (match) => !match.isBye && match.status !== 'VALIDATED',
      ) ?? [],
  );

  /**
   * A player who left mid-match will never validate their score: the session stops there until the
   * admin corrects the score for them. Worth saying so.
   */
  private readonly goneFromBlockingMatches = computed(() => {
    const gone = new Map(
      (this.session()?.participants ?? [])
        .filter((participant) => participant.status === 'LEFT')
        .map((participant) => [participant.id, participant.name]),
    );

    const names = new Set<string>();
    for (const match of this.blockingMatches()) {
      for (const team of [match.teamA, match.teamB]) {
        for (const member of team?.members ?? []) {
          const name = gone.get(member.id);
          if (name) {
            names.add(name);
          }
        }
      }
    }
    return [...names];
  });

  /**
   * What the next round would give with the current headcount. Shown before the click: if the
   * configuration allows no match, the admin knows right away, and knows what to change.
   */
  public readonly nextRoundPreview = computed(() => {
    const settings = this.previewSettings();
    if (!settings || !this.canGenerateRound()) {
      return null;
    }
    return describeRoundPreview(this.presentParticipants().length, settings, 'present');
  });

  /** Explained under the action bar rather than leaving a greyed-out button without a reason. */
  public readonly generateBlockedReason = computed(() => {
    if (!this.isSessionOpen() || this.canGenerateRound()) {
      return null;
    }
    if (this.presentParticipants().length === 0) {
      return 'Inscrivez au moins un joueur pour générer un round.';
    }

    const gone = this.goneFromBlockingMatches();
    if (gone.length > 0) {
      const who = gone.join(' et ');
      const verb = gone.length > 1 ? 'sont parti(e)s' : 'est parti(e)';
      return `${who} ${verb} en cours de match. Corrigez le score de ce match (crayon sur sa ligne) pour débloquer le round suivant.`;
    }

    // No combination of sizes can form two teams: say it before the click, with what has to change.
    const settings = this.previewSettings();
    if (settings && !this.hasPlayableRound()) {
      return describeRoundPreview(this.presentParticipants().length, settings, 'present');
    }

    return 'Tous les matchs du round en cours doivent être validés avant de générer le suivant.';
  });

  /** These blocks call for an action from the admin, not just for patience. */
  public readonly generateBlockedIsAlert = computed(
    () =>
      this.goneFromBlockingMatches().length > 0 ||
      (this.presentParticipants().length > 0 && !this.hasPlayableRound()),
  );

  constructor() {
    // What the page shows. A failed refresh keeps the last admin view on screen - the store keeps
    // its data on failure - and so does a public payload landing in the shared slot. The view is
    // only dropped when the store has nothing left, or holds another session.
    effect(() => {
      const session = this.sessionData();
      const sessionCode = this.sessionCode();
      const isAdminView =
        !!session && session.participants.every((participant) => 'code' in participant);

      untracked(() => {
        if (isAdminView && session.code === sessionCode) {
          this.adminView.set(session as TrainingSessionAdminDto);
        } else if (!session || session.code !== sessionCode) {
          this.adminView.set(null);
        }
      });
    });

    // `trainingAdminGuard` has already sent away anyone without a password: all that is left here is
    // loading the group the URL asks for.
    effect(() => {
      const trainingCode = this.trainingCode();
      const password = this.adminPassword();

      if (!trainingCode || !password) {
        return;
      }
      if (this.training()?.code !== trainingCode) {
        this.store.dispatch(connectTrainingAdministrator({ code: trainingCode, password }));
      }
    });

    // Loads the session and what goes with it, once the password is known.
    //
    // The guard is an instance field, not a comparison with the session in memory: coming back to
    // an already loaded session, it is still in the store while the socket has just been closed -
    // so everything does need to be reloaded and re-subscribed.
    effect(() => {
      const sessionCode = this.sessionCode();
      const password = this.adminPassword();

      if (!sessionCode || !password || this.loadedSessionCode === sessionCode) {
        return;
      }

      this.loadedSessionCode = sessionCode;
      this.reloadSession(sessionCode);
    });

    // The requested session could not be loaded. As long as something valid is still on screen
    // (brief network drop), the admin stays where they are - the toast is enough. Otherwise the
    // page has nothing to show: back to the group, from where the right session can be reopened.
    effect(() => {
      const sessionCode = this.sessionCode();
      const hasError = !!this.sessionError();
      const displayed = this.session();

      if (!sessionCode || !hasError || displayed?.code === sessionCode) {
        return;
      }
      untracked(() => this.backToTraining());
    });

    // The URL can name a session that belongs to another group: session codes are unique across the
    // whole application, nothing prevents pasting one that is not from here.
    effect(() => {
      const trainingCode = this.trainingCode();
      const session = this.session();

      if (!trainingCode || !session || session.code !== this.sessionCode()) {
        return;
      }
      // A server that does not say which group the session belongs to leaves nothing to decide on:
      // nobody is sent away on a guess.
      if (!session.trainingCode || session.trainingCode === trainingCode) {
        return;
      }

      untracked(() => {
        this.store.dispatch(
          addNotification({
            notification: {
              id: newId(),
              message: 'Séance introuvable pour ce groupe d’entraînement.',
              typeIcon: 'error',
              type: 'error',
              createdAt: Date.now(),
            },
          }),
        );
        this.backToTraining();
      });
    });

    // Websocket reconnection or return to the foreground: some broadcasts may have been missed.
    onResyncRequested(() => {
      const sessionCode = this.sessionCode();
      if (sessionCode) {
        this.reloadSession(sessionCode);
      }
    });
  }

  ngOnInit(): void {
    this.activatedRoute.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      this.trainingCode.set(params.get('trainingCode'));
      this.sessionCode.set(params.get('sessionCode'));
    });
  }

  ngOnDestroy(): void {
    this.store.dispatch(leaveTrainingSession());
  }

  private reloadSession(sessionCode: string): void {
    this.store.dispatch(connectTrainingSessionAdministrator({ sessionCode }));
    this.store.dispatch(loadTrainingRounds({ sessionCode }));
    this.store.dispatch(loadTrainingLeaderboard({ sessionCode }));
  }

  // ========= Navigation =========

  public backToTraining(): void {
    this.router.navigate([`/admin/training/${this.trainingCode()}`]);
  }

  // ========= Check-in =========

  public openCheckin(): void {
    const sessionCode = this.sessionCode();
    if (!sessionCode) {
      return;
    }

    this.dialog.open<void, TrainingCheckinPopupData>(TrainingCheckinPopup, {
      data: { sessionCode },
      panelClass: 'dialog-panel-large',
      backdropClass: 'dialog-backdrop-light',
      disableClose: false,
    });
  }

  public markParticipantLeft(participant: TrainingParticipantAdminDto): void {
    const sessionCode = this.sessionCode();
    if (!sessionCode) {
      return;
    }

    const data: ConfirmationData = {
      title: 'Marquer comme parti',
      message: `${participant.name} ne sera plus apparié(e) aux prochains rounds. Ses résultats restent au classement de la séance.`,
      confirmLabel: 'Marquer comme parti',
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
          this.store.dispatch(
            removeTrainingParticipant({ sessionCode, participantId: participant.id }),
          );
        }
      });
  }

  // ========= Teams =========

  public createTeam(creation: TrainingTeamCreation): void {
    const sessionCode = this.sessionCode();
    if (!sessionCode) {
      return;
    }
    this.store.dispatch(
      createTrainingTeam({
        sessionCode,
        participantIds: creation.participantIds,
        name: creation.name,
      }),
    );
  }

  public dissolveTeam(team: TrainingTeamDto): void {
    const sessionCode = this.sessionCode();
    if (!sessionCode) {
      return;
    }

    const teamLabel = team.name || team.members.map((member) => member.name).join(' · ');
    const data: ConfirmationData = {
      title: "Dissoudre l'équipe",
      message: `${teamLabel} ne jouera plus ensemble. Les joueurs seront appariés individuellement aux prochains rounds.`,
      confirmLabel: 'Dissoudre',
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
          this.store.dispatch(dissolveTrainingTeam({ sessionCode, teamId: team.id }));
        }
      });
  }

  // ========= Rounds and scores =========

  public generateRound(): void {
    const sessionCode = this.sessionCode();
    if (!sessionCode) {
      return;
    }
    this.store.dispatch(generateTrainingRound({ sessionCode }));
  }

  public updateScore(update: TrainingScoreUpdate): void {
    const sessionCode = this.sessionCode();
    if (!sessionCode) {
      return;
    }
    this.store.dispatch(
      adminUpdateTrainingScore({
        sessionCode,
        matchId: update.matchId,
        scoreA: update.scoreA,
        scoreB: update.scoreB,
      }),
    );
  }

  public closeSession(): void {
    const sessionCode = this.sessionCode();
    if (!sessionCode) {
      return;
    }

    const data: ConfirmationData = {
      title: 'Clôturer la séance',
      message:
        'Cette action est irréversible. Aucun nouveau round ni check-in ne sera possible, et le classement sera figé.',
      confirmLabel: 'Clôturer',
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
          this.store.dispatch(closeTrainingSession({ sessionCode }));
        }
      });
  }
}
