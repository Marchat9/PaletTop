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
} from '@angular/core';
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
import { disconnectTrainingAdministrator } from 'src/app/store/training/training.actions';
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
import {
  describeRoundPreview,
  previewRound,
} from '../training-session-creation-page/round-preview.util';
import { TrainingScoreUpdate, TrainingTeamCreation } from './admin-training-session-page.models';
import { SessionActions } from './components/session-actions/session-actions';
import { SessionHeader } from './components/session-header/session-header';
import { SessionLeaderboard } from './components/session-leaderboard/session-leaderboard';
import { SessionParticipants } from './components/session-participants/session-participants';
import { SessionRound } from './components/session-round/session-round';
import { SessionRoundsHistory } from './components/session-rounds-history/session-rounds-history';
import { SessionTeams } from './components/session-teams/session-teams';

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
  private readonly router = inject(Router);
  private readonly store = inject(Store);
  private readonly dialog = inject(Dialog);

  public readonly trainingCode = signal<string | null>(null);
  public readonly sessionCode = signal<string | null>(null);

  // Champ simple et non réactif : une garde portée par un signal relancerait l'effect.
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
   * La page n'affiche que la vue admin d'une séance. Le store ne porte qu'un seul emplacement de
   * séance, où a pu atterrir la vue publique (page joueur visitée juste avant) : on la reconnaît
   * à ses participants sans code et on attend la réponse admin plutôt que d'afficher des codes
   * vides.
   */
  public readonly session = computed<TrainingSessionAdminDto | null>(() => {
    const session = this.sessionData();
    if (!session || !session.participants.every((participant) => 'code' in participant)) {
      return null;
    }
    return session as TrainingSessionAdminDto;
  });

  private readonly adminPassword = computed(() => this.adminSession()?.password ?? null);
  public readonly isSessionOpen = computed(() => this.session()?.status === 'OPEN');

  public readonly presentParticipants = computed(
    () => this.session()?.participants.filter((p) => p.status === 'PRESENT') ?? [],
  );

  /** Un joueur ne peut appartenir qu'à une seule équipe fixe active. */
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

  /** Réglages de répartition de la séance, tels que les lit l'aperçu. */
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

  /** Y a-t-il seulement un round à générer avec l'effectif et les réglages du moment ? */
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

  /** Les matchs du round en cours qui empêchent d'enchaîner. */
  private readonly blockingMatches = computed(
    () =>
      this.currentRound()?.matches.filter(
        (match) => !match.isBye && match.status !== 'VALIDATED',
      ) ?? [],
  );

  /**
   * Un joueur parti en plein match ne validera jamais son score : la séance s'arrête là tant que
   * l'administrateur ne corrige pas le score à sa place. Autant le lui dire.
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
   * Ce que donnerait le prochain round avec l'effectif du moment. Affiché avant le clic : si la
   * configuration ne permet aucun match, l'administrateur le sait tout de suite et sait quoi
   * changer.
   */
  public readonly nextRoundPreview = computed(() => {
    const settings = this.previewSettings();
    if (!settings || !this.canGenerateRound()) {
      return null;
    }
    return describeRoundPreview(this.presentParticipants().length, settings, 'present');
  });

  /** Expliqué sous la barre d'actions plutôt que de laisser un bouton grisé sans raison. */
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

    // Aucune combinaison de tailles ne permet de former deux équipes : le dire avant le clic,
    // avec ce qu'il faut changer.
    const settings = this.previewSettings();
    if (settings && !this.hasPlayableRound()) {
      return describeRoundPreview(this.presentParticipants().length, settings, 'present');
    }

    return 'Tous les matchs du round en cours doivent être validés avant de générer le suivant.';
  });

  /** Ces blocages demandent une action de l'administrateur, pas seulement de la patience. */
  public readonly generateBlockedIsAlert = computed(
    () =>
      this.goneFromBlockingMatches().length > 0 ||
      (this.presentParticipants().length > 0 && !this.hasPlayableRound()),
  );

  constructor() {
    // Le mot de passe vit dans le store (restauré du localStorage) : sans lui, retour à la connexion.
    effect(() => {
      const trainingCode = this.trainingCode();
      const password = this.adminPassword();

      if (!trainingCode) {
        return;
      }
      if (!password) {
        this.reconnectAsAdmin();
        return;
      }
      if (this.training()?.code !== trainingCode) {
        this.store.dispatch(connectTrainingAdministrator({ code: trainingCode, password }));
      }
    });

    // Chargement de la séance et de ce qui l'accompagne, une fois le mot de passe connu.
    //
    // La garde est un champ d'instance, pas une comparaison avec la séance en mémoire : en
    // revenant sur une séance déjà chargée, celle-ci est encore dans le store alors que le
    // socket vient d'être fermé — il faut donc bien tout recharger et se rebrancher.
    effect(() => {
      const sessionCode = this.sessionCode();
      const password = this.adminPassword();

      if (!sessionCode || !password || this.loadedSessionCode === sessionCode) {
        return;
      }

      this.loadedSessionCode = sessionCode;
      this.reloadSession(sessionCode);
    });

    // La séance demandée n'a pas pu être chargée. Tant qu'il reste quelque chose de valable à
    // l'écran (coupure réseau passagère), on laisse l'administrateur où il est — le toast suffit.
    // Sinon la page n'a rien à montrer : retour au groupe, d'où il peut rouvrir la bonne séance.
    effect(() => {
      const sessionCode = this.sessionCode();
      const hasError = !!this.sessionError();
      const displayed = this.session();

      if (!sessionCode || !hasError || displayed?.code === sessionCode) {
        return;
      }
      untracked(() => this.backToTraining());
    });

    // L'URL peut désigner une séance qui appartient à un autre groupe : les codes de séance sont
    // uniques pour toute l'application, rien n'empêche d'en coller un qui n'est pas d'ici.
    effect(() => {
      const trainingCode = this.trainingCode();
      const session = this.session();

      if (!trainingCode || !session || session.code !== this.sessionCode()) {
        return;
      }
      // Un serveur qui ne dit pas à quel groupe appartient la séance ne permet pas de trancher :
      // on ne renvoie personne sur une supposition.
      if (!session.trainingCode || session.trainingCode === trainingCode) {
        return;
      }

      untracked(() => {
        this.store.dispatch(
          addNotification({
            notification: {
              id: crypto.randomUUID(),
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

    // Reconnexion websocket ou retour au premier plan : on a pu manquer des diffusions.
    onResyncRequested(() => {
      const sessionCode = this.sessionCode();
      if (sessionCode) {
        this.reloadSession(sessionCode);
      }
    });
  }

  ngOnInit(): void {
    this.activatedRoute.paramMap.subscribe((params) => {
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

  private reconnectAsAdmin(): void {
    this.store.dispatch(disconnectTrainingAdministrator());
    this.router.navigate(['/admin/training']);
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

  // ========= Équipes =========

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

  // ========= Rounds et scores =========

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
