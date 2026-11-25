import { Dialog } from '@angular/cdk/dialog';
import { BreakpointObserver } from '@angular/cdk/layout';
import { Overlay } from '@angular/cdk/overlay';
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  Injector,
  OnInit,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { environment } from '@environment';
import { Actions, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { debounceTime, filter, map, tap } from 'rxjs';
import { openPlanSimulationSheet } from 'src/app/modales/plan-simulation-popup/plan-simulation-popup';
import { Nullable } from 'src/app/models/nullable.model';
import { TournamentConfigurationDto } from 'src/app/models/tournament-configuration.model';
import { BracketPanelState, PlanSimulationState } from 'src/app/models/tournament-plan.model';
import { TournamentStatus } from 'src/app/models/tournament-status.enum';
import { AdminPageHeader } from 'src/app/shared/admin-page-header/admin-page-header';
import { Button } from 'src/app/shared/button/button';
import {
  TournamentConfigurationField,
  TournamentConfigurationForm,
} from 'src/app/shared/tournament-configuration/tournament-configuration-form.model';
import {
  selectMaxConsolationCount,
  selectScoreCalculationsByMode,
} from 'src/app/store/app-settings/app-settings.selectors';
import { disconnectTournamentAdministrator } from 'src/app/store/tournament/tournament.actions';
import {
  connectTournamentAdministrator,
  updateTournamentAdministratorConfiguration,
  updateTournamentAdministratorConfigurationSuccess,
} from 'src/app/store/tournament/tournament.admin.actions';
import {
  selectCurrentTournamentAdminInformations,
  selectCurrentTournamentData,
  selectCurrentTournamentIsAdminView,
  selectCurrentTournamentIsLoading,
  selectTournamentUpdateConfigLoading,
} from 'src/app/store/tournament/tournament.selectors';
import { previewPlan, simulatePlan } from 'src/app/store/tournament-plan/tournament-plan.actions';
import {
  selectPlanPreview,
  selectPlanPreviewLoading,
  selectSimulatedPlan,
  selectSimulationError,
} from 'src/app/store/tournament-plan/tournament-plan.selectors';
import { normalizeCode } from 'src/app/utils/code-format.util';
import { keepSectionInView } from 'src/app/utils/keep-section-in-view.util';
import { LEADERBOARD_MOBILE_QUERY } from 'src/app/utils/leaderboard-dialog.util';
import { onResyncRequested } from 'src/app/utils/resync-on-reconnect.util';
import {
  PLAN_PREVIEW_DEBOUNCE_MS,
  planPreviewBodies,
  repeatsPreview,
} from 'src/app/utils/tournament-configuration.utils';
import { ConfigurationFormComponent } from './components/configuration-form/configuration-form.component';
import {
  CONFIGURATION_MODE_SECTION,
  CONFIGURATION_SECTION_QUERY_PARAM,
} from './configuration-page.constants';

const MODE_SPECIFIC_SECTION_ID = 'tournament-mode-specific';

/**
 * The configuration of a tournament, on a page of its own (opened from the header of the admin
 * page): the form, the live preview of the brackets and the simulation of other team counts.
 */
@Component({
  selector: 'app-admin-tournament-configuration-page',
  imports: [AdminPageHeader, Button, ConfigurationFormComponent],
  templateUrl: './admin-tournament-configuration-page.html',
  styleUrl: './admin-tournament-configuration-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminTournamentConfigurationPage implements OnInit {
  private readonly activatedRoute = inject(ActivatedRoute);
  private readonly actions$ = inject(Actions);
  private readonly destroyRef = inject(DestroyRef);
  private readonly dialog = inject(Dialog);
  private readonly injector = inject(Injector);
  private readonly overlay = inject(Overlay);
  private readonly router = inject(Router);
  private readonly store = inject(Store);
  private readonly breakpointObserver = inject(BreakpointObserver);

  public readonly tournamentCode = signal<Nullable<string>>(null);

  // Selects
  public readonly tournament = this.store.selectSignal(selectCurrentTournamentData);
  private readonly adminSession = this.store.selectSignal(selectCurrentTournamentAdminInformations);
  private readonly isAdminView = this.store.selectSignal(selectCurrentTournamentIsAdminView);
  private readonly tournamentFetching = this.store.selectSignal(selectCurrentTournamentIsLoading);
  public readonly saveLoading = this.store.selectSignal(selectTournamentUpdateConfigLoading);
  public readonly scoreCalculationsByMode = this.store.selectSignal(selectScoreCalculationsByMode);

  private readonly tournamentLoading = computed(
    () => !this.tournament() && this.tournamentFetching(),
  );
  private readonly adminPassword = computed(() => this.adminSession()?.password ?? null);

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

  // Simulation (« et si j'ai X équipes ? »): its plan is requested apart from the preview of the form.
  private readonly requestedSimulatedPlan = this.store.selectSignal(selectSimulatedPlan);
  /** The simulation is at the preview's team count: it shows the preview's plan, not a request. */
  private readonly simulationRepeatsPreview = signal(true);
  private readonly simulatedPlan = computed(() =>
    this.simulationRepeatsPreview() ? this.plan() : this.requestedSimulatedPlan(),
  );
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

  private form: Nullable<TournamentConfigurationForm> = null;
  /** The form, for the « Enregistrer » button of the header: it saves what the form holds. */
  protected readonly configurationForm = viewChild(ConfigurationFormComponent);

  constructor() {
    // Try to connect when code / password change (a refresh loses the tournament, not the session).
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

    // Check if all required data are present or redirect to admin login page.
    effect(() => {
      if (!this.tournament() && !this.tournamentLoading()) {
        this.reconnectAsAdmin();
      }
    });

    // Saved: what the form holds is now what the tournament has, nothing is left to lose.
    this.actions$
      .pipe(
        ofType(updateTournamentAdministratorConfigurationSuccess),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => this.configurationForm()?.markSaved());

    onResyncRequested(() => {
      const code = this.tournament()?.code;
      const password = this.adminPassword();
      if (code && password) {
        this.store.dispatch(connectTournamentAdministrator({ code, password }));
      }
    });
  }

  ngOnInit(): void {
    this.activatedRoute.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const code = params.get('tournamentCode');
      if (code) {
        // Normalized like the stored code: otherwise "abc" never equals the loaded "ABC".
        this.tournamentCode.set(normalizeCode(code));
      } else {
        this.reconnectAsAdmin();
      }
    });
  }

  /** The form holds changes that were not saved: leaving the page would lose them. */
  public hasUnsavedChanges(): boolean {
    return !!this.form?.dirty;
  }

  public onConfigurationFormReady(form: TournamentConfigurationForm): void {
    this.form = form;
    this.bringModeSectionIntoView();
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
        tap((body) =>
          this.simulationRepeatsPreview.set(repeatsPreview(form, this.registeredCount(), body)),
        ),
        filter(() => !this.simulationRepeatsPreview()),
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

  public updateTournamentConfiguration(tournament: TournamentConfigurationDto): void {
    const id = this.tournament()?.id;
    if (!id) {
      return;
    }
    this.store.dispatch(
      updateTournamentAdministratorConfiguration({ idtournament: id, tournament }),
    );
  }

  public backToTournament(): void {
    const code = this.tournament()?.code ?? this.tournamentCode();
    void this.router.navigate(code ? ['/admin/tournament', code] : ['/admin/tournament']);
  }

  /** The launch check sends the admin here to set the brackets by hand. */
  private bringModeSectionIntoView(): void {
    if (
      this.activatedRoute.snapshot?.queryParamMap.get(CONFIGURATION_SECTION_QUERY_PARAM) !==
      CONFIGURATION_MODE_SECTION
    ) {
      return;
    }
    // The form is built before it has drawn its sections, and the page keeps growing around them.
    afterNextRender(() => keepSectionInView(MODE_SPECIFIC_SECTION_ID), {
      injector: this.injector,
    });
  }

  private reconnectAsAdmin(): void {
    this.store.dispatch(disconnectTournamentAdministrator());
    // Opened from a link without an admin session: keep the code, only the password is missing.
    const code = this.tournamentCode();
    void this.router.navigate(['/admin/tournament'], code ? { queryParams: { code } } : {});
  }
}
