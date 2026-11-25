import { FormControl, FormGroup } from '@angular/forms';

export type StructuredTournamentForm = FormGroup<{
  numberOfQualifyingRounds: FormControl<number>;
  consolationCount: FormControl<number>;
  hasChallenges: FormControl<boolean>;
  hasThirdPlaceMatch: FormControl<boolean>;
}>;
