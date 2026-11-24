import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Card } from '../../card/card';
import { Nullable } from 'src/app/models/nullable.model';
import { ScoreCalculation } from 'src/app/models/tournament-configuration-detail.model';
import { BracketPanelState } from 'src/app/models/tournament-plan.model';
import { InputCardRadio, InputCardRadioOption } from '../../input-card-radio/input-card-radio';
import { TournamentConfigurationField } from '../tournament-configuration-form.model';
import * as configuration from '../tournament-create.data';
import { ChampionshipTournament } from './championship-tournament/championship-tournament';
import { StructuredTournament } from './structured-tournament/structured-tournament';
import { TournamentModeParameterForm } from './tournament-mode-parameter-form.model';
import { UpDownTournament } from './up-down-tournament/up-down-tournament';
import { Icon } from '../../icon/icon';

@Component({
  selector: 'app-tournament-mode-parameter',
  imports: [
    ReactiveFormsModule,
    Card,
    InputCardRadio,
    StructuredTournament,
    UpDownTournament,
    ChampionshipTournament,
    Icon,
  ],
  templateUrl: './tournament-mode-parameter.html',
  styleUrls: ['../shared-config.scss', './tournament-mode-parameter.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TournamentModeParameter {
  public readonly group = input.required<TournamentModeParameterForm>();
  /** « Nombre d'équipes cible » (rules group), edited with the structured settings. */
  public readonly targetControl = input.required<FormControl<number>>();
  /** Preview of the structured brackets; null when the page gives none. */
  public readonly planState = input<Nullable<BracketPanelState>>(null);
  public readonly readonlyFields = input<TournamentConfigurationField[]>([]);
  public readonly hiddenFields = input<TournamentConfigurationField[]>([]);
  /** Score calculations of the selected mode (filtered by the parent). */
  public readonly scoreCalculationOptions = input<InputCardRadioOption<ScoreCalculation>[]>([]);

  public readonly competitionModeOptions = configuration.competitionModeOptions;
}
