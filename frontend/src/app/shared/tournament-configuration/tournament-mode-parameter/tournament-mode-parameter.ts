import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { environment } from '@environment';
import { Card } from '../../card/card';
import { ScoreCalculation } from 'src/app/models/tournament-configuration-detail.model';
import { InputCardRadio, InputCardRadioOption } from '../../input-card-radio/input-card-radio';
import { InputSelectOption } from '../../input-select/input-select';
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
  public readonly readonlyFields = input<TournamentConfigurationField[]>([]);
  public readonly hiddenFields = input<TournamentConfigurationField[]>([]);
  /** Score calculations of the selected mode (filtered by the parent). */
  public readonly scoreCalculationOptions = input<InputCardRadioOption<ScoreCalculation>[]>([]);

  public readonly competitionModeOptions = configuration.competitionModeOptions;
  public readonly principalBracketSizeOptions: InputSelectOption[] = [
    { value: '', label: 'Automatique' },
    ...environment.tournamentConfiguration.principalBracketSize.options.map((v) => ({
      value: v.toString(),
      label: `${v} équipes`,
    })),
  ];
  public readonly numberOfQualifyingRoundsConfig =
    environment.tournamentConfiguration.numberOfQualifyingRounds;
  public readonly numberOfPoolsConfig = environment.tournamentConfiguration.numberOfPools;
}
