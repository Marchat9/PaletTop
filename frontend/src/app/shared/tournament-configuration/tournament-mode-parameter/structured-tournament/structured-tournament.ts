import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { environment } from '@environment';
import { InputCheckbox } from 'src/app/shared/input-checkbox/input-checkbox';
import { InputNumber } from 'src/app/shared/input-number/input-number';
import { InputSelect, InputSelectOption } from 'src/app/shared/input-select/input-select';
import { TournamentConfigurationField } from '../../tournament-configuration-form.model';
import * as configuration from '../../tournament-create.data';
import { StructuredTournamentForm } from './structured-tournament-form.model';

@Component({
  selector: 'app-structured-tournament',
  imports: [ReactiveFormsModule, InputCheckbox, InputSelect, InputNumber],
  templateUrl: './structured-tournament.html',
  styleUrls: ['../../shared-config.scss', './structured-tournament.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StructuredTournament {
  public readonly group = input.required<StructuredTournamentForm>();
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
