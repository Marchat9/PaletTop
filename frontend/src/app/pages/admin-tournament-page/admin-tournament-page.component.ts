import { UpDownTournamentConfig } from 'src/app/models/tournament-configuration-detail.model';
import {
  selectMaxConsolationCount,
  selectScoreCalculationsByMode,
} from 'src/app/store/app-settings/app-settings.selectors';
import {
  BracketPanelState,
  LaunchChoice,
  PlanSimulationState,
  TournamentPlan,
} from 'src/app/models/tournament-plan.model';
import {
  EDIT_CONFIGURATION,
  openLaunchCheckPopup,
} from 'src/app/modales/launch-check-popup/launch-check-popup';
import { openStartSummaryPopup } from 'src/app/modales/start-summary-popup/start-summary-popup';
import {
  buildLaunchPlanBody,
  isSummaryLaunch,
  launchChoiceOfConfiguration,
  launchChoiceOfOption,
} from 'src/app/utils/launch-check.util';
import { openPlanSimulationSheet } from 'src/app/modales/plan-simulation-popup/plan-simulation-popup';
import { LEADERBOARD_MOBILE_QUERY } from 'src/app/utils/leaderboard-dialog.util';
import {
  previewLaunchPlan,
  previewPlan,
  simulatePlan,
} from 'src/app/store/tournament-plan/tournament-plan.actions';
import {
  selectLaunchPlan,
  selectLaunchPlanLoading,
  selectPlanPreview,
  selectPlanPreviewLoading,
  selectSimulatedPlan,
  selectSimulationError,
} from 'src/app/store/tournament-plan/tournament-plan.selectors';
import { TournamentConfigurationForm } from 'src/app/shared/tournament-configuration/tournament-configuration-form.model';
import {
  PLAN_PREVIEW_DEBOUNCE_MS,
  planPreviewBodies,
} from 'src/app/utils/tournament-configuration.utils';
import { normalizeCode } from 'src/app/utils/code-format.util';
import { newId } from 'src/app/utils/unique-id.util';
import { buildRankingPdf, rankingPdfFileName } from 'src/app/utils/pdf/ranking-pdf.util';
import { buildMatchesPdf, matchesPdfFileName } from 'src/app/utils/pdf/matches-pdf.util';
import {
  buildRoundHistoryViews,
  toTournamentRoundHistories,
} from 'src/app/utils/rounds-history.util';
import { toTournamentAdminMatchGroups } from 'src/app/utils/match-groups.util';
import { computeRepechedByBracket } from 'src/app/utils/repeched.util';
import { RepechedList } from 'src/app/shared/repeched-list/repeched-list';
import { TournamentParcours } from 'src/app/shared/tournament-parcours/tournament-parcours';
import { PdfExportService } from 'src/app/services/pdf-export.service';
import { TournamentStatus } from 'src/app/models/tournament-status.enum';
import { TournamentNextStep } from './components/tournament-next-step/tournament-next-step';
import { RoundsHistory } from 'src/app/shared/rounds-history/rounds-history';
import { Dialog } from '@angular/cdk/dialog';
import { BreakpointObserver } from '@angular/cdk/layout';
import { Overlay } from '@angular/cdk/overlay';
import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  OnInit,
  signal,
  untracked,
  DestroyRef,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { debounceTime, filter, map } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { environment } from '@environment';
import { Store } from '@ngrx/store';
import {
  ConfirmationData,
  ConfirmationPopupComponent,
} from 'src/app/modales/confirmation-popup/confirmation-popup';
import { addNotification } from 'src/app/store/app-config/app-config.actions';
import { Notification } from 'src/app/store/app-config/app-config.model';
import { ScoreUpdate } from 'src/app/models/score-update.model';
import { TeamConfigEvent, TeamConfigEventType } from 'src/app/models/team-config.model';
import { TournamentConfigurationDto } from 'src/app/models/tournament-configuration.model';
import { AnimateOnChangeDirective } from 'src/app/shared/animate-on-change/animate-on-change.directive';
import { Leaderboard } from 'src/app/shared/leaderboard/leaderboard';
import { Button } from 'src/app/shared/button/button';
import { toTournamentLeaderboard } from 'src/app/utils/leaderboard.util';
import { TournamentConfigurationField } from 'src/app/shared/tournament-configuration/tournament-configuration-form.model';
import { adminUpdateScore } from 'src/app/store/match/match.actions';
import { selectRanking, selectRankingIsLoading } from 'src/app/store/ranking/ranking.selectors';
import { disconnectTournamentAdministrator } from 'src/app/store/tournament/tournament.actions';
import {
  connectTournamentAdministrator,
  removeTournamentAdministratorTeam,
  updateTournamentAdministratorConfiguration,
  updateTournamentAdministratorSingleTeam,
  updateTournamentAdministratorTeam,
} from 'src/app/store/tournament/tournament.admin.actions';
import {
  completeTournament,
  nextSession,
  startTournament,
} from 'src/app/store/tournament/tournament.match.actions';
import {
  selectCompleteTournamentLoading,
  selectCurrentTournamentAdminInformations,
  selectCurrentTournamentIsAdminView,
  selectCurrentTournamentData,
  selectCurrentTournamentIsLoading,
  selectNextSessionLoading,
  selectStartTournamentLoading,
  selectStartTournamentTeamCountChanged,
  selectTournamentUpdateConfigLoading,
} from 'src/app/store/tournament/tournament.selectors';
import { TournamentDto } from 'src/app/store/tournament/tournament.models';
import { CurrentRoundCard } from 'src/app/shared/current-round-card/current-round-card';
import { MatchesSessionDto, SessionStatus } from 'src/app/models/matches-session.model';
import { Nullable } from 'src/app/models/nullable.model';
import { TournamentConfigurationCardComponent } from './components/tournament-configuration-card/tournament-configuration-card.component';
import { TournamentHeaderComponent } from './components/tournament-header/tournament-header.component';
import { TournamentTeamConfigurationCard } from './components/tournament-team-configuration-card/tournament-team-configuration-card';
import {
  clearTournamentClubSuggestions,
  searchTournamentClubs,
} from 'src/app/store/tournament-club/tournament-club.actions';
import { selectTournamentClubSuggestions } from 'src/app/store/tournament-club/tournament-club.selectors';
import { selectSessions } from 'src/app/store/session/session.selectors';
import { selectAdminUpdateScoreLoading } from 'src/app/store/match/match.selectors';
import { onResyncRequested } from 'src/app/utils/resync-on-reconnect.util';

const TEAM_COUNT_CHANGED_NOTICE =
  "Le nombre d'équipes a changé depuis la dernière vérification : voici le parcours à jour.";

@Component({
  selector: 'app-admin-tournament-page',
  standalone: true,
  imports: [
    CommonModule,
    TournamentHeaderComponent,
    TournamentConfigurationCardComponent,
    TournamentTeamConfigurationCard,
    CurrentRoundCard,
    TournamentNextStep,
    Leaderboard,
    Button,
    RoundsHistory,
    RepechedList,
    TournamentParcours,
    AnimateOnChangeDirective,
  ],
  templateUrl: './admin-tournament-page.component.html',
  styleUrl: './admin-tournament-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminTournamentPageComponent implements OnInit {
  private readonly activatedRoute = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);
  private readonly store = inject(Store);
  private readonly dialog = inject(Dialog);
  private readonly overlay = inject(Overlay);
  private readonly breakpointObserver = inject(BreakpointObserver);
  private readonly pdfExport = inject(PdfExportService);

  readonly tournamentCode = signal<string | null>(null);

  // Selects
  public readonly tournament = this.store.selectSignal(selectCurrentTournamentData);
  private readonly adminSession = this.store.selectSignal(selectCurrentTournamentAdminInformations);
  private readonly isAdminView = this.store.selectSignal(selectCurrentTournamentIsAdminView);
  public readonly sessions = this.store.selectSignal(selectSessions);
  public readonly ranking = this.store.selectSignal(selectRanking);
  public readonly clubSuggestions = this.store.selectSignal(selectTournamentClubSuggestions);

  // Loadings
  /** The tournament is being fetched, a first time or again. */
  private readonly tournamentFetching = this.store.selectSignal(selectCurrentTournamentIsLoading);
  public readonly tournamentLoading = computed(
    () => !this.tournament() && this.tournamentFetching(),
  );
  public readonly completeLoading = this.store.selectSignal(selectCompleteTournamentLoading);
  public readonly isUpdateConfigLoading = this.store.selectSignal(
    selectTournamentUpdateConfigLoading,
  );
  public readonly startLoading = this.store.selectSignal(selectStartTournamentLoading);
  private readonly launchPlan = this.store.selectSignal(selectLaunchPlan);
  private readonly launchPlanLoading = this.store.selectSignal(selectLaunchPlanLoading);
  /** The start is busy from the launch check to the answer of the server. */
  public readonly startPending = computed(() => this.startLoading() || this.launchPlanLoading());
  public readonly nextLoading = this.store.selectSignal(selectNextSessionLoading);
  public readonly scoreUpdateLoading = this.store.selectSignal(selectAdminUpdateScoreLoading);
  public readonly rankingLoading = computed(
    () => !this.ranking() && this.store.selectSignal(selectRankingIsLoading)(),
  );
  public readonly rankingTable = computed(() =>
    toTournamentLeaderboard(
      this.ranking() ?? [],
      this.tournament()?.configuration?.scoreCalculation ?? 'victory_ga',
    ),
  );

  // Compute
  public readonly adminPassword = computed(() => this.adminSession()?.password ?? null);
  /** The final ranking PDF is offered once the tournament is over and its ranking is loaded. */
  public readonly canDownloadRanking = computed(
    () =>
      this.tournament()?.status === TournamentStatus.FINISHED && (this.ranking()?.length ?? 0) > 0,
  );
  public readonly isRankingExporting = signal(false);
  /** The PDF of every match is offered once the tournament is over. */
  public readonly canDownloadMatches = computed(
    () =>
      this.tournament()?.status === TournamentStatus.FINISHED && (this.sessions()?.length ?? 0) > 0,
  );
  public readonly isMatchesExporting = signal(false);
  /** Drawn rounds stay correctable while the tournament runs and once it is over, not cancelled. */
  public readonly canEditRoundsHistory = computed(
    () => this.tournament()?.status !== TournamentStatus.CANCELLED,
  );

  public readonly pointsPerGame = computed(() =>
    Number(this.tournament()?.configuration?.pointsPerGame ?? 13),
  );
  public readonly isActive = computed(() => this.tournament()?.status === TournamentStatus.ACTIVE);
  public readonly canGenerateNewSession = computed(
    () => this.tournament()?.tournamentStatus?.canGenerateNewSession ?? false,
  );
  public readonly currentSession = computed<Nullable<MatchesSessionDto>>(() => {
    const list = this.sessions();
    return !list?.length
      ? null
      : list.reduce((latest, s) => (s.sessionNumber > latest.sessionNumber ? s : latest));
  });
  public readonly currentRoundNumber = computed(() =>
    this.isActive() ? (this.currentSession()?.sessionNumber ?? null) : null,
  );
  public readonly currentRoundGroups = computed(() =>
    toTournamentAdminMatchGroups(this.currentSession()?.matches ?? []),
  );
  /** The plan of a structured tournament as the server froze it: never recomputed here. */
  public readonly parcoursPlan = computed(() => this.tournament()?.plan ?? null);
  /** Number of the last finished round (qualifying rounds counted, like the rounds of the plan). */
  public readonly parcoursDoneRounds = computed(() =>
    (this.sessions() ?? []).reduce(
      (last, session) =>
        session.status === SessionStatus.CLOSED ? Math.max(last, session.sessionNumber) : last,
      0,
    ),
  );
  public readonly parcoursCurrentRound = computed(
    () =>
      (this.sessions() ?? []).find((session) => session.status === SessionStatus.OPEN)
        ?.sessionNumber ?? null,
  );
  public readonly repechedBrackets = computed(() =>
    computeRepechedByBracket(this.sessions() ?? []),
  );
  public readonly showCurrentRound = computed(() => this.isActive() && !!this.currentSession());
  /** Where the tournament stands while no round is listed. */
  public readonly currentRoundMessage = computed(() => {
    switch (this.tournament()?.status) {
      case TournamentStatus.DRAFT:
        return "Le tournoi n'a pas encore démarré : les rounds apparaîtront ici une fois lancé depuis la carte « Prochaine étape ».";
      case TournamentStatus.FINISHED:
        return '🎉 Le tournoi est terminé, félicitation à tout le monde. 🎉';
      case TournamentStatus.CANCELLED:
        return "Le tournoi est annulé. Contactez l'administrateur pour plus d'informations.";
      default:
        return null;
    }
  });
  public readonly roundHistories = computed(() => {
    const tournament = this.tournament();
    return toTournamentRoundHistories(
      this.sessions() ?? [],
      tournament?.configuration?.competitionMode ?? 'standard',
      this.canEditRoundsHistory(),
      tournament?.configuration?.competitionConfiguration as UpDownTournamentConfig | undefined,
    );
  });

  public readonly scoreCalculationsByMode = this.store.selectSignal(selectScoreCalculationsByMode);

  // Live preview of the brackets: only a draft still has its plan to build.
  private readonly plan = this.store.selectSignal(selectPlanPreview);
  private readonly planLoading = this.store.selectSignal(selectPlanPreviewLoading);
  private readonly maxConsolations = this.store.selectSignal(selectMaxConsolationCount);
  private readonly isDraft = computed(() => this.tournament()?.status === TournamentStatus.DRAFT);
  private readonly registeredCount = computed(() => this.tournament()?.teams.length ?? 0);
  private readonly registeredCount$ = toObservable(this.registeredCount);
  public readonly planState = computed<Nullable<BracketPanelState>>(() =>
    this.isDraft()
      ? {
          plan: this.plan(),
          loading: this.planLoading(),
          maxConsolations: this.maxConsolations(),
          registeredCount: this.registeredCount(),
        }
      : null,
  );
  /** Increases with each request: the reducer keeps the result of the latest one only. */
  private previewSequence = 0;
  private simulationSequence = 0;

  // Launch check: the plan of the registered teams is asked for, then the right popup opens.
  private readonly teamCountChanged = this.store.selectSignal(
    selectStartTournamentTeamCountChanged,
  );
  private readonly launchRequested = signal(false);
  /** Team count the launch check is computed for: the start refuses (409) any other count. */
  private launchTeamCount = 0;
  private launchNotice: Nullable<string> = null;
  /** The start was sent from this page: its refusal (409) is ours to answer. */
  private startSent = false;
  /**
   * After a refusal (409): the tournament the refused check was computed from. The check runs
   * again once the tournament fetched anew replaces it, with the teams registered right now.
   */
  private readonly staleTournament = signal<Nullable<TournamentDto>>(null);

  // Simulation (« et si j'ai X équipes ? »): its plan is requested apart from the preview of the form.
  private readonly simulatedPlan = this.store.selectSignal(selectSimulatedPlan);
  private readonly simulationError = this.store.selectSignal(selectSimulationError);
  /** Null until the slider moves: the simulation then starts from the target count. */
  public readonly simulatedTeamCount = signal<number | null>(null);
  private readonly simulatedTeamCount$ = toObservable(this.simulatedTeamCount);
  private readonly isMobile = toSignal(
    this.breakpointObserver.observe(LEADERBOARD_MOBILE_QUERY).pipe(map((state) => state.matches)),
    { initialValue: this.breakpointObserver.isMatched(LEADERBOARD_MOBILE_QUERY) },
  );
  public readonly simulation = computed<Nullable<PlanSimulationState>>(() =>
    this.isDraft()
      ? {
          plan: this.simulatedPlan(),
          teamCount: this.simulatedTeamCount(),
          error: this.simulationError(),
          mobile: this.isMobile(),
        }
      : null,
  );

  // Data
  public readonly hiddenFields: TournamentConfigurationField[] = environment.tournamentConfiguration
    .admin.hiddenFields as TournamentConfigurationField[];
  public readonly readonlyFields: TournamentConfigurationField[] = environment
    .tournamentConfiguration.admin.readonlyFields as TournamentConfigurationField[];

  constructor() {
    // Try to connect when code / password change.
    effect(() => {
      const code = this.tournamentCode();
      const password = this.adminPassword();
      const currentTournamentCode = this.tournament()?.code;

      // Same tournament loaded from the player page (admin who also plays): that view only has the
      // player's own team code, so the admin view still has to be fetched.
      if (!code || !password || (currentTournamentCode === code && this.isAdminView())) {
        return;
      }

      this.store.dispatch(connectTournamentAdministrator({ code, password }));
    });

    // check if all required data are present or redirect to admin login page
    effect(() => {
      if (!this.tournament() && !this.tournamentLoading()) {
        this.reconnectAsAdmin();
      }
    });

    // The launch check opens once its plan is there (it is cleared when asked for again).
    effect(() => {
      const plan = this.launchPlan();
      if (plan && this.launchRequested()) {
        untracked(() => {
          this.launchRequested.set(false);
          this.openLaunchPopup(plan);
        });
      }
    });

    // The teams moved since the check: nothing in the store says how many there are now, so the
    // tournament is fetched again before the new check.
    effect(() => {
      if (this.teamCountChanged() && this.startSent) {
        untracked(() => {
          this.startSent = false;
          this.reloadBeforeLaunchCheck();
        });
      }
    });

    // The tournament fetched anew is there: check again, and say why.
    effect(() => {
      const stale = this.staleTournament();
      const tournament = this.tournament();
      if (stale && tournament && tournament !== stale && !this.tournamentFetching()) {
        untracked(() => {
          this.staleTournament.set(null);
          this.requestLaunchCheck(TEAM_COUNT_CHANGED_NOTICE);
        });
      }
    });

    // Club suggestions belong to one tournament: drop them when leaving the page (disconnect,
    // navigation) so they never show up in another tournament.
    this.destroyRef.onDestroy(() => this.store.dispatch(clearTournamentClubSuggestions()));

    onResyncRequested(() => {
      const code = this.tournament()?.code;
      const password = this.adminPassword();
      if (code && password) {
        this.store.dispatch(connectTournamentAdministrator({ code, password }));
      }
    });
  }

  public onConfigurationFormReady(form: TournamentConfigurationForm): void {
    planPreviewBodies(form, this.registeredCount$)
      .pipe(
        filter(() => this.isDraft()),
        debounceTime(PLAN_PREVIEW_DEBOUNCE_MS),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((body) =>
        this.store.dispatch(previewPlan({ requestId: String(++this.previewSequence), body })),
      );
    planPreviewBodies(form, this.simulatedTeamCount$)
      .pipe(
        filter(() => this.isDraft()),
        debounceTime(PLAN_PREVIEW_DEBOUNCE_MS),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((body) =>
        this.store.dispatch(simulatePlan({ requestId: String(++this.simulationSequence), body })),
      );
  }

  public openSimulationSheet(targetCount: number): void {
    openPlanSimulationSheet(this.dialog, this.overlay, {
      targetCount,
      plan: this.simulatedPlan,
      teamCount: this.simulatedTeamCount,
      error: this.simulationError,
      changeTeamCount: (teamCount) => this.simulatedTeamCount.set(teamCount),
    });
  }

  ngOnInit(): void {
    this.activatedRoute.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const code = params.get('tournamentCode');
      if (code) {
        // Normalized like the stored code: otherwise "abc" never equals the loaded "ABC" and the
        // connection effect fires again on every response.
        const normalized = normalizeCode(code);
        if (normalized !== this.tournamentCode()) {
          this.store.dispatch(clearTournamentClubSuggestions());
        }
        this.tournamentCode.set(normalized);
      } else {
        this.reconnectAsAdmin();
      }
    });
  }

  // ========= Actions  =========

  public disconnect(): void {
    // Leave the page first: cleared while still on screen, the session makes the page ask for the
    // admin login again, and that navigation won over the one to the home page.
    void this.router
      .navigate(['/accueil'])
      .then(() => this.store.dispatch(disconnectTournamentAdministrator()));
  }
  private reconnectAsAdmin(): void {
    this.store.dispatch(disconnectTournamentAdministrator());
    // Opened from a link without an admin session: keep the code, only the password is missing.
    const code = this.tournamentCode();
    this.router.navigate(['/admin/tournament'], code ? { queryParams: { code } } : {});
  }

  public updateTournamentConfiguration(tournament: TournamentConfigurationDto): void {
    const id = this.tournament()?.id;
    if (!id) {
      return;
    }
    this.store.dispatch(
      updateTournamentAdministratorConfiguration({ idtournament: id, tournament }),
    );
  }

  public searchClubs(search: string): void {
    const code = this.tournament()?.code;
    if (!code) {
      return;
    }
    this.store.dispatch(searchTournamentClubs({ code, search }));
  }

  public updateTournamentTeam(event: TeamConfigEvent): void {
    const code = this.tournament()?.code;
    if (!code) {
      return;
    }
    switch (event.type) {
      case TeamConfigEventType.CREATE_TEAM:
        this.store.dispatch(updateTournamentAdministratorTeam({ code, teams: [event.payload] }));
        break;
      case TeamConfigEventType.IMPORT_TEAMS:
        this.store.dispatch(
          updateTournamentAdministratorTeam({
            code,
            teams: event.payload,
            importSummary: {
              importedCount: event.payload.length,
              ignoredCount: event.ignoredRows ?? 0,
            },
          }),
        );
        break;
      case TeamConfigEventType.UPDATE_TEAM: {
        const team = this.tournament()?.teams.find((t) => t.id === event.payload.teamId);
        if (!team?.code) {
          return;
        }
        this.store.dispatch(
          updateTournamentAdministratorSingleTeam({
            tournamentCode: code,
            teamCode: team.code,
            teamId: event.payload.teamId,
            teamData: { name: event.payload.name, players: event.payload.players },
          }),
        );
        break;
      }
      case TeamConfigEventType.REMOVE_TEAM: {
        const team = this.tournament()?.teams.find((t) => t.id === event.payload.teamId);
        if (!team?.code) {
          return;
        }
        const data: ConfirmationData = {
          title: "Supprimer l'équipe",
          message: `Cette action est irréversible. L'équipe "${team.name}" et ses joueurs seront définitivement supprimés.`,
          confirmLabel: 'Supprimer',
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
                removeTournamentAdministratorTeam({
                  tournamentCode: code,
                  teamCode: team.code!,
                  teamId: event.payload.teamId,
                }),
              );
            }
          });
        break;
      }
      default:
        break;
    }
  }

  public adminScoreUpdate(updatedScore: ScoreUpdate): void {
    this.store.dispatch(adminUpdateScore(updatedScore));
  }

  public onNotification(notification: Notification): void {
    this.store.dispatch(addNotification({ notification }));
  }

  /** Downloads the final ranking as an A4 PDF (tournament header, two columns when long). */
  public async downloadRanking(): Promise<void> {
    const tournament = this.tournament();
    const ranking = this.ranking();
    if (!tournament || !ranking?.length || this.isRankingExporting()) {
      return;
    }

    this.isRankingExporting.set(true);
    try {
      await this.pdfExport.download(
        buildRankingPdf(tournament, ranking, window.location.origin),
        rankingPdfFileName(tournament),
      );
    } catch {
      this.onNotification({
        id: newId(),
        message: "Le classement n'a pas pu être généré. Réessayez.",
        typeIcon: 'warning',
        type: 'Téléchargement',
        createdAt: Date.now(),
      });
    } finally {
      this.isRankingExporting.set(false);
    }
  }

  /** Downloads every match of the finished tournament, round after round, as an A4 PDF. */
  public async downloadMatches(): Promise<void> {
    const tournament = this.tournament();
    const sessions = this.sessions();
    if (!tournament || !sessions?.length || this.isMatchesExporting()) {
      return;
    }

    this.isMatchesExporting.set(true);
    try {
      const rounds = buildRoundHistoryViews(
        sessions,
        tournament.configuration.competitionMode,
        false,
        tournament.configuration.competitionConfiguration as UpDownTournamentConfig,
      );
      await this.pdfExport.download(
        buildMatchesPdf(tournament, rounds, window.location.origin),
        matchesPdfFileName(tournament),
      );
    } catch {
      this.onNotification({
        id: newId(),
        message: "La liste des matchs n'a pas pu être générée. Réessayez.",
        typeIcon: 'warning',
        type: 'Téléchargement',
        createdAt: Date.now(),
      });
    } finally {
      this.isMatchesExporting.set(false);
    }
  }

  public startTournament(): void {
    this.requestLaunchCheck(null);
  }

  /** Asks for the plan of the registered teams; a mode without a plan has its plain confirmation. */
  private requestLaunchCheck(notice: Nullable<string>): void {
    const tournament = this.tournament();
    if (!tournament || this.startPending()) {
      return;
    }
    const body = buildLaunchPlanBody(tournament);
    if (!body) {
      this.confirmPlainStart();
      return;
    }
    this.launchNotice = notice;
    this.launchTeamCount = body.teamCount;
    this.launchRequested.set(true);
    this.store.dispatch(previewLaunchPlan({ body }));
  }

  private reloadBeforeLaunchCheck(): void {
    const tournament = this.tournament();
    const password = this.adminPassword();
    if (!tournament || !password) {
      return;
    }
    this.staleTournament.set(tournament);
    this.store.dispatch(connectTournamentAdministrator({ code: tournament.code, password }));
  }

  /** Exactly the planned count: a summary to confirm. Otherwise: the options to choose from. */
  private openLaunchPopup(plan: TournamentPlan): void {
    const tournament = this.tournament();
    if (!tournament) {
      return;
    }
    const registeredCount = this.launchTeamCount;
    const notice = this.launchNotice;
    this.launchNotice = null;
    const mobile = this.isMobile();

    if (isSummaryLaunch(plan)) {
      openStartSummaryPopup(this.dialog, this.overlay, { plan, mobile, notice }).closed.subscribe(
        (confirmed) => {
          if (confirmed) {
            this.sendStart(launchChoiceOfConfiguration(tournament, registeredCount));
          }
        },
      );
      return;
    }

    openLaunchCheckPopup(this.dialog, {
      plan,
      registeredCount,
      targetCount: tournament.configuration.maxTeamCapacity,
      mobile,
      notice,
    }).closed.subscribe((result) => {
      if (result === EDIT_CONFIGURATION) {
        this.configurationCard()?.reveal();
        return;
      }
      const optionId = result;
      const option = plan.options.find((candidate) => candidate.id === optionId);
      if (option) {
        this.sendStart(launchChoiceOfOption(option, registeredCount));
      }
    });
  }

  private sendStart(launchChoice: LaunchChoice): void {
    if (this.startLoading()) {
      return;
    }
    this.startSent = true;
    this.store.dispatch(startTournament({ launchChoice }));
  }

  private confirmPlainStart(): void {
    const data: ConfirmationData = {
      title: 'Démarrer le tournoi',
      message:
        'Cette action est irréversible. Les équipes seront réparties aléatoirement dans les poules et les matchs du premier round seront générés.',
      confirmLabel: 'Démarrer',
    };

    this.dialog
      .open<boolean, ConfirmationData>(ConfirmationPopupComponent, {
        data,
        panelClass: 'dialog-panel',
        backdropClass: 'dialog-backdrop-light',
        disableClose: false,
      })
      .closed.subscribe((confirmed) => {
        if (confirmed && !this.startLoading()) {
          this.store.dispatch(startTournament({}));
        }
      });
  }

  private readonly teamCard = viewChild(TournamentTeamConfigurationCard);
  private readonly configurationCard = viewChild(TournamentConfigurationCardComponent);

  /** From the next-step card: open the team creation (sheet on mobile, form on desktop). */
  public addTeam(): void {
    this.teamCard()?.startTeamCreation();
  }

  /** From the next-step card: open the Excel import wizard. */
  public importTeams(): void {
    this.teamCard()?.startTeamImport();
  }

  public nextSession(): void {
    // The button only re-renders as loading on the next change detection: a double click can
    // land in between. The store signal is already up to date after the first dispatch.
    if (this.nextLoading()) {
      return;
    }
    this.store.dispatch(nextSession());
  }

  public completeTournament(): void {
    const data: ConfirmationData = {
      title: 'Terminer le tournoi',
      message:
        'Cette action est irréversible. Le tournoi sera clôturé et aucun nouveau round ne pourra être démarré.',
      confirmLabel: 'Terminer',
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
          this.store.dispatch(completeTournament());
        }
      });
  }
}
