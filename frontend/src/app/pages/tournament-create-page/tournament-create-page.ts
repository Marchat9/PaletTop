import { of, debounceTime } from 'rxjs';
import {
  selectMaxConsolationCount,
  selectScoreCalculationsByMode,
} from 'src/app/store/app-settings/app-settings.selectors';
import { normalizeCode } from 'src/app/utils/code-format.util';
import { CommonModule, NgOptimizedImage } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { Nullable } from 'src/app/models/nullable.model';
import { TournamentConfiguration as TournamentConfigurationComponent } from 'src/app/shared/tournament-configuration/tournament-configuration';
import { TournamentConfigurationForm } from 'src/app/shared/tournament-configuration/tournament-configuration-form.model';
import { createTournament } from 'src/app/store/tournament/tournament.actions';
import {
  selectTournamentCreationError,
  selectTournamentCreationIsLoading,
} from 'src/app/store/tournament/tournament.selectors';
import { Button } from '../../shared/button/button';
import {
  convertTournamentFormToTournamentConfigurationDto,
  PLAN_PREVIEW_DEBOUNCE_MS,
  planPreviewBodies,
} from 'src/app/utils/tournament-configuration.utils';
import { BracketPanelState } from 'src/app/models/tournament-plan.model';
import { previewPlan } from 'src/app/store/tournament-plan/tournament-plan.actions';
import {
  selectPlanPreview,
  selectPlanPreviewLoading,
} from 'src/app/store/tournament-plan/tournament-plan.selectors';
import { TournamentConfigurationDto } from 'src/app/models/tournament-configuration.model';
import { Icon } from 'src/app/shared/icon/icon';

@Component({
  selector: 'app-tournament-create-page',
  standalone: true,
  imports: [CommonModule, NgOptimizedImage, Button, TournamentConfigurationComponent, Icon],
  templateUrl: './tournament-create-page.html',
  styleUrl: './tournament-create-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TournamentCreatePageComponent {
  private readonly router = inject(Router);
  private readonly store = inject(Store);
  private readonly destroyRef = inject(DestroyRef);

  public readonly isCreationLoading = this.store.selectSignal(selectTournamentCreationIsLoading);
  public readonly scoreCalculationsByMode = this.store.selectSignal(selectScoreCalculationsByMode);
  public readonly creationError = this.store.selectSignal(selectTournamentCreationError);
  private readonly plan = this.store.selectSignal(selectPlanPreview);
  private readonly planLoading = this.store.selectSignal(selectPlanPreviewLoading);
  private readonly maxConsolations = this.store.selectSignal(selectMaxConsolationCount);

  public readonly planState = computed<BracketPanelState>(() => ({
    plan: this.plan(),
    loading: this.planLoading(),
    maxConsolations: this.maxConsolations(),
    registeredCount: null,
  }));

  public readonly tournamentForm = signal<Nullable<TournamentConfigurationForm>>(null);
  public readonly invalidFieldNames = signal<Nullable<string[]>>(null);
  public readonly userHasSubmitted = signal(false);
  /** The list of invalid fields waits for a first edit: a blank form is not an error yet. */
  public readonly formEdited = signal(false);
  private invalidFieldsReports = 0;
  /** Increases with each request: the reducer keeps the result of the latest one only. */
  private previewSequence = 0;

  constructor() {
    effect(() => {
      const tournamentCode: string =
        this.tournamentForm()?.get('parameters')?.get('code')?.value ?? '';
      if (
        this.userHasSubmitted() &&
        !this.isCreationLoading() &&
        !this.creationError() &&
        !!tournamentCode
      ) {
        this.router.navigate([`/admin/tournament/${normalizeCode(tournamentCode)}`]);
      }
    });
  }

  public onFormReady(form: TournamentConfigurationForm): void {
    this.tournamentForm.set(form);
    planPreviewBodies(form, of(null))
      .pipe(debounceTime(PLAN_PREVIEW_DEBOUNCE_MS), takeUntilDestroyed(this.destroyRef))
      .subscribe((body) =>
        this.store.dispatch(previewPlan({ requestId: String(++this.previewSequence), body })),
      );
  }

  public onInvalidFields(fields: Nullable<string[]>): void {
    this.invalidFieldNames.set(fields);
    // The first report comes from the form construction, the next ones from the user's edits.
    if (this.invalidFieldsReports++ > 0) {
      this.formEdited.set(true);
    }
  }

  public submit(): void {
    if (this.tournamentForm()?.valid) {
      const configuration: TournamentConfigurationDto =
        convertTournamentFormToTournamentConfigurationDto(this.tournamentForm()!);

      this.userHasSubmitted.set(true);
      this.store.dispatch(createTournament({ configuration }));
    }
  }
  public cancel(): void {
    this.router.navigate(['/']);
  }
}
