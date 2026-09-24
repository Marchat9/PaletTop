import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  OnInit,
  signal,
  untracked,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { Button } from 'src/app/shared/button/button';
import { Card } from 'src/app/shared/card/card';
import { Icon } from 'src/app/shared/icon/icon';
import {
  InputCardRadio,
  InputCardRadioOption,
} from 'src/app/shared/input-card-radio/input-card-radio';
import { InputChipOption, InputChips } from 'src/app/shared/input-chips/input-chips';
import { InputNumber } from 'src/app/shared/input-number/input-number';
import { Switch } from 'src/app/shared/switch/switch';
import { disconnectTrainingAdministrator } from 'src/app/store/training/training.actions';
import { connectTrainingAdministrator } from 'src/app/store/training/training.admin.actions';
import {
  connectTrainingSessionAdministrator,
  createTrainingSession,
  loadTrainingSessions,
} from 'src/app/store/training/training.session.actions';
import {
  selectCreateTrainingSessionError,
  selectCreateTrainingSessionLoading,
  selectCurrentTrainingAdminInformations,
  selectCurrentTrainingData,
  selectCurrentTrainingSessionData,
  selectTrainingSessions,
} from 'src/app/store/training/training.selectors';
import {
  TrainingSessionAdminDto,
  TrainingTeamComposition,
} from 'src/app/store/training/training.models';
import { describeRoundPreview } from './round-preview.util';
import { InputDate } from 'src/app/shared/input-date/input-date';

/** Même borne que le serveur : au-delà, une « équipe » n'en est plus une. */
const MAX_PLAYERS_PER_TEAM = 6;

@Component({
  selector: 'app-training-session-creation-page',
  imports: [
    Card,
    Button,
    Icon,
    InputNumber,
    InputChips,
    InputCardRadio,
    Switch,
    DatePipe,
    InputDate,
  ],
  templateUrl: './training-session-creation-page.html',
  styleUrl: './training-session-creation-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TrainingSessionCreationPage implements OnInit {
  private readonly activatedRoute = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly store = inject(Store);

  public readonly trainingCode = signal<string | null>(null);

  // Selects
  public readonly training = this.store.selectSignal(selectCurrentTrainingData);
  public readonly sessions = this.store.selectSignal(selectTrainingSessions);
  public readonly creationLoading = this.store.selectSignal(selectCreateTrainingSessionLoading);
  public readonly creationError = this.store.selectSignal(selectCreateTrainingSessionError);
  private readonly adminSession = this.store.selectSignal(selectCurrentTrainingAdminInformations);
  private readonly loadedSession = this.store.selectSignal(selectCurrentTrainingSessionData);

  // Formulaire
  public readonly minDate = new Date();
  public readonly date = signal(this.toInputDate(this.minDate));
  public readonly playersPerTeam = signal(2);
  public readonly allowedTeamSizes = signal<number[]>([1,3]);
  public readonly preferTargetTeamSize = signal(false);
  public readonly plateCount = signal(10);
  public readonly teamComposition = signal<TrainingTeamComposition>('RANDOM');
  public readonly pointsPerGame = signal(13);
  public readonly avoidSamePartnerConsecutive = signal(true);
  public readonly avoidSameOpponentConsecutive = signal(true);
  public readonly settingsReused = signal(false);
  private readonly hasSubmitted = signal(false);
  // Codes connus au moment de l'envoi : la séance créée est celle qui n'y figure pas.
  private readonly knownSessionCodes = signal<ReadonlySet<string>>(new Set());

  // Gardes de chargement : des champs simples, volontairement hors signaux, pour qu'un effect
  // ne puisse pas se redéclencher sur la réponse de son propre appel.
  private sessionsRequestedFor: string | null = null;
  private previousSessionRequestedFor: string | null = null;

  private readonly adminPassword = computed(() => this.adminSession()?.password ?? null);

  /** La séance la plus récente : les listes arrivent de la plus ancienne à la plus récente. */
  public readonly previousSession = computed(() => this.sessions().at(-1) ?? null);

  /**
   * Les réglages ne sont pas dans le résumé des séances : on charge le détail de la dernière
   * à l'arrivée sur la page, pour que le bouton de reprise soit immédiatement utilisable.
   */
  public readonly previousSettings = computed<TrainingSessionAdminDto | null>(() => {
    const previous = this.previousSession();
    const loaded = this.loadedSession();
    if (!previous || !loaded || loaded.code !== previous.code) {
      return null;
    }
    return loaded as TrainingSessionAdminDto;
  });

  public readonly canSubmit = computed(
    () =>
      !!this.date() &&
      this.playersPerTeam() > 0 &&
      this.plateCount() > 0 &&
      this.pointsPerGame() > 0,
  );

  /** Six tailles possibles ; celle visée est cochée d'office et ne se décoche pas. */
  public readonly teamSizeOptions = computed<InputChipOption[]>(() =>
    Array.from({ length: MAX_PLAYERS_PER_TEAM }, (_, index) => index + 1).map((size) => ({
      value: size,
      label: `${size}`,
      locked: size === this.playersPerTeam(),
    })),
  );

  public readonly arbitrationOptions: InputCardRadioOption<boolean>[] = [
    {
      value: true,
      label: 'Nombre de joueurs par équipe stricte',
      description:
        'Les équipes gardent leur taille configurée (Joueurs par équipe), les joueurs en trop se reposent à tour de rôle.',
    },
    {
      value: false,
      label: 'Le plus de monde joue',
      description: "Les tailles s'ajustent pour faire jouer tout le monde en utilisant la configuration tailles de repli.",
    },
  ];

  public readonly compositionOptions: InputCardRadioOption<TrainingTeamComposition>[] = [
    {
      value: 'RANDOM',
      label: 'Au hasard',
      description: 'Les équipes sont tirées au sort à chaque round.',
    },
    {
      value: 'LEARNING',
      label: 'Apprentissage',
      description: "Les joueurs forts sont associés a des joueurs plus faibles pour leurs donner des conseils.",
    },
  ];

  /** La composition par niveau n'a aucun sens pour des équipes d'un seul joueur. */
  public readonly showComposition = computed(() => this.playersPerTeam() > 1);

  /**
   * Aucun participant n'est encore inscrit à ce stade : l'aperçu se fonde sur le roster du
   * groupe. C'est une illustration des réglages, pas une prédiction de la séance.
   */
  public readonly rosterPreview = computed(() => {
    const members = this.training()?.members?.length ?? 0;
    if (members === 0) {
      return null;
    }

    return describeRoundPreview(
      members,
      {
        playersPerTeam: this.playersPerTeam(),
        allowedTeamSizes: this.allowedTeamSizes(),
        preferTargetTeamSize: this.preferTargetTeamSize(),
        plateCount: this.plateCount(),
      },
      'roster',
    );
  });

  constructor() {
    // Le mot de passe vient du store (restauré du localStorage) : sans lui, retour à la connexion.
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

    // Liste des séances, puis détail de la dernière : de quoi alimenter la reprise des réglages.
    //
    // `sessions()` est lu sans être suivi, et la garde retient le code déjà demandé : sans ça
    // l'effect se redéclencherait sur sa propre réponse — une liste vide revient avec un nouveau
    // tableau à chaque fois, donc la condition resterait vraie indéfiniment.
    effect(() => {
      const trainingCode = this.training()?.code;
      if (!trainingCode || this.sessionsRequestedFor === trainingCode) {
        return;
      }

      this.sessionsRequestedFor = trainingCode;
      if (untracked(this.sessions).length === 0) {
        this.store.dispatch(loadTrainingSessions({ trainingCode }));
      }
    });

    effect(() => {
      const previous = this.previousSession();
      if (!previous || this.previousSessionRequestedFor === previous.code) {
        return;
      }

      this.previousSessionRequestedFor = previous.code;
      if (untracked(this.loadedSession)?.code !== previous.code) {
        this.store.dispatch(connectTrainingSessionAdministrator({ sessionCode: previous.code }));
      }
    });

    // Une fois la séance créée, on enchaîne directement sur son pilotage.
    effect(() => {
      const created = this.loadedSession();
      const trainingCode = this.trainingCode();

      if (
        this.hasSubmitted() &&
        !this.creationLoading() &&
        !this.creationError() &&
        created &&
        trainingCode &&
        !this.knownSessionCodes().has(created.code)
      ) {
        this.router.navigate([`/admin/training/${trainingCode}/session/${created.code}`]);
      }
    });
  }

  ngOnInit(): void {
    this.activatedRoute.paramMap.subscribe((params) => {
      this.trainingCode.set(params.get('trainingCode'));
    });
  }

  // ========= Formulaire =========

  public onDateChange(value: Date): void {
    this.date.set(this.toInputDate(value));
  }

  public reusePreviousSettings(): void {
    const previous = this.previousSettings();
    if (!previous) {
      return;
    }

    this.playersPerTeam.set(previous.playersPerTeam);
    this.allowedTeamSizes.set([...previous.allowedTeamSizes]);
    this.preferTargetTeamSize.set(previous.preferTargetTeamSize);
    this.plateCount.set(previous.plateCount);
    this.teamComposition.set(previous.teamComposition);
    this.pointsPerGame.set(previous.pointsPerGame);
    this.avoidSamePartnerConsecutive.set(previous.avoidSamePartnerConsecutive);
    this.avoidSameOpponentConsecutive.set(previous.avoidSameOpponentConsecutive);
    this.settingsReused.set(true);
  }

  public submit(): void {
    const trainingCode = this.trainingCode();
    if (!trainingCode || !this.canSubmit()) {
      return;
    }

    this.knownSessionCodes.set(new Set(this.sessions().map((session) => session.code)));
    this.hasSubmitted.set(true);
    this.store.dispatch(
      createTrainingSession({
        trainingCode,
        configuration: {
          date: new Date(this.date()),
          playersPerTeam: this.playersPerTeam(),
          allowedTeamSizes: this.allowedTeamSizes(),
          preferTargetTeamSize: this.preferTargetTeamSize(),
          plateCount: this.plateCount(),
          teamComposition: this.teamComposition(),
          avoidSamePartnerConsecutive: this.avoidSamePartnerConsecutive(),
          avoidSameOpponentConsecutive: this.avoidSameOpponentConsecutive(),
          pointsPerGame: this.pointsPerGame(),
        },
      }),
    );
  }

  public cancel(): void {
    this.router.navigate([`/admin/training/${this.trainingCode()}`]);
  }

  private reconnectAsAdmin(): void {
    this.store.dispatch(disconnectTrainingAdministrator());
    this.router.navigate(['/admin/training']);
  }

  // Construit la date en heure locale : `toISOString` bascule en UTC et afficherait
  // la veille pour toute séance créée en soirée depuis la France.
  private toInputDate(date: Date): string {
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
