import { FormControl, FormGroup } from '@angular/forms';

export type TournamentParametersForm = FormGroup<{
  name: FormControl<string>;
  code: FormControl<string>;
  date: FormControl<Date>;
  adminPassword: FormControl<string>;
  description: FormControl<string | null>;
}>;
