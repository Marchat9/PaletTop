import {
  ScoreCalculationsByMode,
  DEFAULT_SCORE_CALCULATIONS_BY_MODE,
} from 'src/app/models/app-setting.model';
import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { merge } from 'rxjs';
import { Nullable } from 'src/app/models/nullable.model';
import { BracketPanelState, PlanSimulationState } from 'src/app/models/tournament-plan.model';
import { TournamentConfigurationDto } from 'src/app/models/tournament-configuration.model';
import { Button } from 'src/app/shared/button/button';
import { TournamentConfiguration } from 'src/app/shared/tournament-configuration/tournament-configuration';
import {
  TournamentConfigurationField,
  TournamentConfigurationForm,
} from 'src/app/shared/tournament-configuration/tournament-configuration-form.model';
import { TournamentDto } from 'src/app/store/tournament/tournament.models';
import { convertTournamentFormToTournamentConfigurationDto } from 'src/app/utils/tournament-configuration.utils';

@Component({
  selector: 'app-configuration-form',
  standalone: true,
  imports: [CommonModule, Button, TournamentConfiguration],
  templateUrl: './configuration-form.component.html',
  styleUrl: './configuration-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfigurationFormComponent {
  // ======= Input / Output =======
  public readonly tournament = input<Nullable<TournamentDto>>(null);
  public readonly saving = input(false);
  public readonly readonlyFields = input<TournamentConfigurationField[]>([]);
  public readonly hiddenFields = input<TournamentConfigurationField[]>([]);
  public readonly scoreCalculationsByMode = input<ScoreCalculationsByMode>(
    DEFAULT_SCORE_CALCULATIONS_BY_MODE,
  );

  public readonly planState = input<Nullable<BracketPanelState>>(null);
  public readonly simulation = input<Nullable<PlanSimulationState>>(null);

  public readonly configurationSaved = output<TournamentConfigurationDto>();
  public readonly formReady = output<TournamentConfigurationForm>();
  public readonly configurationCancelled = output<void>();
  public readonly simulationTeamCountChange = output<number>();
  public readonly simulationSheetRequested = output<number>();
  // ==============================

  public readonly tournamentForm = signal<Nullable<TournamentConfigurationForm>>(null);
  public readonly invalidFieldNames = signal<Nullable<string[]>>(null);
  private initialFormValues: Nullable<TournamentConfigurationForm['value']> = null;

  private readonly destroyRef = inject(DestroyRef);
  /** `pristine` is not a signal: this one changes whenever the form does, to recompute what depends on it. */
  private readonly formRevision = signal(0);

  /** Something to save, and nothing in the way: what both « Enregistrer » buttons follow. */
  public readonly canSave = computed(() => {
    this.formRevision();
    const form = this.tournamentForm();
    return (
      !!form && !!this.tournament() && !this.saving() && !form.pristine && !this.invalidFieldNames()
    );
  });
  public readonly canCancel = computed(() => {
    this.formRevision();
    return !this.saving() && !this.tournamentForm()?.pristine;
  });

  public onFormReady(form: TournamentConfigurationForm): void {
    this.tournamentForm.set(form);
    this.initialFormValues = form.getRawValue();
    merge(form.valueChanges, form.statusChanges)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.formRevision.update((revision) => revision + 1));
    this.formReady.emit(form);
  }

  /** What the form holds is now what the tournament has: nothing left to save or to lose. */
  public markSaved(): void {
    this.tournamentForm()?.markAsPristine();
    this.formRevision.update((revision) => revision + 1);
  }

  public onSave(): void {
    if (this.tournamentForm()?.pristine || this.tournamentForm()?.invalid) {
      this.tournamentForm()!.markAllAsTouched();
      if (this.tournamentForm()?.invalid) {
      }
      return;
    }
    const formattedConfig: TournamentConfigurationDto =
      convertTournamentFormToTournamentConfigurationDto(this.tournamentForm()!);
    this.configurationSaved.emit(formattedConfig);
  }

  public onCancel(): void {
    if (this.initialFormValues) {
      this.tournamentForm()!.reset(this.initialFormValues);
    }
    this.configurationCancelled.emit();
  }
}
