import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { environment } from '@environment';
import { Card } from '../../card/card';
import { InputCardRadio } from '../../input-card-radio/input-card-radio';
import { InputSelectOption } from '../../input-select/input-select';
import { TournamentConfigurationField } from '../tournament-configuration-form.model';
import * as configuration from '../tournament-create.data';
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
