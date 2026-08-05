import { FormGroup } from '@angular/forms';
import { TournamentConfigurationDto } from 'src/app/models/tournament-configuration.model';
import { TournamentParametersForm } from './tournament-parameters/tournament-parameters-form.model';
import { TournamentRulesForm } from './tournament-rules/tournament-rules-form.model';
import { TournamentModeParameterForm } from './tournament-mode-parameter/tournament-mode-parameter-form.model';
import { TournamentConfigurationDetailsDto } from 'src/app/models/tournament-configuration-detail.model';

export type TournamentConfigurationForm = FormGroup<{
  parameters: TournamentParametersForm;
  rules: TournamentRulesForm;
  modeParameter: TournamentModeParameterForm;
}>;

export type TournamentConfigurationField =
  | keyof Omit<TournamentConfigurationDto, 'configuration'>
  | keyof TournamentConfigurationDetailsDto
  | 'rematch'
  | 'matchAgainstFullSameClub'
  | 'matchAgainstPartialSameClub';
