import { ChangeDetectionStrategy, Component, computed, input, Signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { environment } from '@environment';
import { startWith, switchMap } from 'rxjs';
import { Nullable } from 'src/app/models/nullable.model';
import { BracketPanelState } from 'src/app/models/tournament-plan.model';
import { BracketPanel } from 'src/app/shared/bracket-panel/bracket-panel';
import { InlineNotice } from 'src/app/shared/inline-notice/inline-notice';
import { InputNumber } from 'src/app/shared/input-number/input-number';
import { Switch } from 'src/app/shared/switch/switch';
import { TournamentConfigurationField } from '../../tournament-configuration-form.model';
import { StructuredTournamentForm } from './structured-tournament-form.model';

@Component({
  selector: 'app-structured-tournament',
  imports: [ReactiveFormsModule, Switch, InputNumber, InlineNotice, BracketPanel],
  templateUrl: './structured-tournament.html',
  styleUrls: ['../../shared-config.scss', './structured-tournament.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StructuredTournament {
  public readonly group = input.required<StructuredTournamentForm>();
  /** « Nombre d'équipes cible »: the tournament's capacity, which lives in the rules group. */
  public readonly targetControl = input.required<FormControl<number>>();
  /** Preview of the brackets; the panel is hidden when the page has none to give. */
  public readonly planState = input<Nullable<BracketPanelState>>(null);
  public readonly readonlyFields = input<TournamentConfigurationField[]>([]);
  public readonly hiddenFields = input<TournamentConfigurationField[]>([]);

  public readonly numberOfQualifyingRoundsConfig =
    environment.tournamentConfiguration.numberOfQualifyingRounds;
  public readonly targetCountConfig = environment.tournamentConfiguration.maxTeamCapacity;

  protected readonly consolationCount: Signal<number> = controlValue(
    computed(() => this.group().controls.consolationCount),
    0,
  );
  protected readonly targetCount: Signal<number> = controlValue(
    this.targetControl,
    this.targetCountConfig.max,
  );

  protected addConsolation(): void {
    this.setConsolationCount(this.consolationCount() + 1);
  }

  protected removeConsolation(): void {
    this.setConsolationCount(this.consolationCount() - 1);
  }

  private setConsolationCount(count: number): void {
    const control = this.group().controls.consolationCount;
    control.setValue(count);
    control.markAsDirty();
  }
}

/** The value of a control that may change with its input, as a signal. */
function controlValue(control: Signal<FormControl<number>>, initialValue: number): Signal<number> {
  return toSignal(
    toObservable(control).pipe(
      switchMap((current) => current.valueChanges.pipe(startWith(current.value))),
    ),
    { initialValue },
  );
}
