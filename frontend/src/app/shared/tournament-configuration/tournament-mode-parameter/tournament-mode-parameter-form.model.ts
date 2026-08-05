import { FormControl, FormGroup } from '@angular/forms';
import { StructuredTournamentForm } from './structured-tournament/structured-tournament-form.model';
import { UpDownTournamentForm } from './up-down-tournament/up-down-tournament-form.model';
import { CompetitionMode } from 'src/app/models/tournament-configuration-detail.model';

export type TournamentModeParameterForm = FormGroup<{
  competitionMode: FormControl<CompetitionMode>;

  structuredMode: StructuredTournamentForm;
  upDownMode: UpDownTournamentForm;
}>;
