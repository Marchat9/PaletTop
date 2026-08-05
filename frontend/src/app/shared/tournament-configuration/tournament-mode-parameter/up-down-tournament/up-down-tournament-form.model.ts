import { FormControl, FormGroup } from '@angular/forms';

export type UpDownTournamentForm = FormGroup<{
  numberOfRound: FormControl<number | undefined>;
}>;
