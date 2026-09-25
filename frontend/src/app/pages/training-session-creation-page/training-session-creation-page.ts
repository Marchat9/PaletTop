import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  OnInit,
  signal,
  untracked,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
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
import { connectTrainingAdministrator } from 'src/app/store/training/training.admin.actions';
import {
  createTrainingSession,
  loadTrainingSessions,
  loadTrainingSessionSettings,
} from 'src/app/store/training/training.session.actions';
import {
  selectCreateTrainingSessionError,
  selectCreateTrainingSessionLoading,
  selectCurrentTrainingAdminInformations,
  selectCurrentTrainingData,
  selectCurrentTrainingSessionData,
  selectPreviousTrainingSessionSettings,
  selectTrainingSessions,
} from 'src/app/store/training/training.selectors';
import {
  TrainingSessionAdminDto,
  TrainingTeamComposition,
} from 'src/app/store/training/training.models';
import { describeRoundPreview } from 'src/app/utils/round-preview.util';
import { InputDate } from 'src/app/shared/input-date/input-date';

/** Same bound as the server: beyond it, a "team" is no longer a team. */
const MAX_PLAYERS_PER_TEAM = 6;

/** Nothing to do with the game, only a bound so a typo cannot travel to the database. */
const MAX_PLATE_COUNT = 100;
const MAX_POINTS_PER_GAME = 100;

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
  private readonly destroyRef = inject(DestroyRef);

  public readonly trainingCode = signal<string | null>(null);

  // Selects
  public readonly training = this.store.selectSignal(selectCurrentTrainingData);
  public readonly sessions = this.store.selectSignal(selectTrainingSessions);
  public readonly creationLoading = this.store.selectSignal(selectCreateTrainingSessionLoading);
  public readonly creationError = this.store.selectSignal(selectCreateTrainingSessionError);
  private readonly adminSession = this.store.selectSignal(selectCurrentTrainingAdminInformations);
  private readonly createdSession = this.store.selectSignal(selectCurrentTrainingSessionData);
  public readonly previousSettings = this.store.selectSignal(selectPreviousTrainingSessionSettings);

  // Form
  public readonly minDate = new Date();
  public readonly date = signal(this.toInputDate(this.minDate));
  public readonly playersPerTeam = signal(2);
  public readonly allowedTeamSizes = signal<number[]>([1, 3]);
  public readonly preferTargetTeamSize = signal(false);
  public readonly plateCount = signal(10);
  public readonly teamComposition = signal<TrainingTeamComposition>('RANDOM');
  public readonly pointsPerGame = signal(13);
  public readonly avoidSamePartnerConsecutive = signal(true);
  public readonly avoidSameOpponentConsecutive = signal(true);
  public readonly settingsReused = signal(false);
  private readonly hasSubmitted = signal(false);

  // Loading guards: plain fields, deliberately outside signals, so that an effect cannot re-trigger
  // itself on the response of its own call.
  private sessionsRequestedFor: string | null = null;
  private previousSessionRequestedFor: string | null = null;

  private readonly adminPassword = computed(() => this.adminSession()?.password ?? null);

  /** The most recent session: lists arrive from the oldest to the most recent. */
  public readonly previousSession = computed(() => this.sessions().at(-1) ?? null);

  /**
   * The sizes sent to the server, and the ones the preview reads: the target size is always part of
   * them, so the form shows exactly what will be applied.
   */
  public readonly teamSizes = computed(() =>
    [...new Set([this.playersPerTeam(), ...this.allowedTeamSizes()])].sort((a, b) => a - b),
  );

  public readonly canSubmit = computed(
    () =>
      !!this.date() &&
      this.playersPerTeam() > 0 &&
      this.plateCount() > 0 &&
      this.pointsPerGame() > 0,
  );

  /** Six possible sizes; the target one is checked from the start and cannot be unchecked. */
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
      label: 'Nombre de joueurs par équipe strict',
      description:
        'Les équipes gardent leur taille configurée (Joueurs par équipe), les joueurs en trop se reposent à tour de rôle.',
    },
    {
      value: false,
      label: 'Le plus de monde joue',
      description:
        "Les tailles s'ajustent pour faire jouer tout le monde en utilisant la configuration tailles de repli.",
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
      description:
        'Les joueurs forts sont associés à des joueurs plus faibles pour leur donner des conseils.',
    },
  ];

  public readonly maxPlayersPerTeam = MAX_PLAYERS_PER_TEAM;
  public readonly maxPlateCount = MAX_PLATE_COUNT;
  public readonly maxPointsPerGame = MAX_POINTS_PER_GAME;

  /** Composition by level makes no sense for teams of a single player. */
  public readonly showComposition = computed(() => this.playersPerTeam() > 1);

  /**
   * No participant is checked in at this stage: the preview is based on the roster of the group. It
   * illustrates the settings, it does not predict the session.
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
        allowedTeamSizes: this.teamSizes(),
        preferTargetTeamSize: this.preferTargetTeamSize(),
        plateCount: this.plateCount(),
      },
      'roster',
    );
  });

  constructor() {
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

    // Session list, then detail of the last one: enough to feed the carry-over of the settings.
    //
    // `sessions()` is read untracked and the guard holds the code already requested: without that
    // the effect would re-trigger itself on its own response - an empty list comes back as a new
    // array every time, so the condition would stay true for ever.
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

    // Settings of the last session, to offer them again. A read of its own: connecting as admin
    // would take over the session on screen and open a websocket on a session nobody is running.
    effect(() => {
      const previous = this.previousSession();
      if (!previous || this.previousSessionRequestedFor === previous.code) {
        return;
      }

      this.previousSessionRequestedFor = previous.code;
      if (untracked(this.previousSettings)?.code !== previous.code) {
        this.store.dispatch(loadTrainingSessionSettings({ sessionCode: previous.code }));
      }
    });

    // Once the session is created, go straight to running it. `currentSession` only holds a created
    // session here: the settings of the previous one live in their own slot.
    effect(() => {
      const created = this.createdSession();
      const trainingCode = this.trainingCode();

      if (
        this.hasSubmitted() &&
        !this.creationLoading() &&
        !this.creationError() &&
        created &&
        trainingCode
      ) {
        this.router.navigate([`/admin/training/${trainingCode}/session/${created.code}`]);
      }
    });
  }

  ngOnInit(): void {
    this.activatedRoute.paramMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => this.trainingCode.set(params.get('trainingCode')));
  }

  // ========= Form =========

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

    this.hasSubmitted.set(true);
    this.store.dispatch(
      createTrainingSession({
        trainingCode,
        configuration: {
          date: new Date(this.date()),
          playersPerTeam: this.playersPerTeam(),
          allowedTeamSizes: this.teamSizes(),
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

  // Builds the date in local time: `toISOString` switches to UTC and would show the day before for
  // any session created in the evening from France.
  private toInputDate(date: Date): string {
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
