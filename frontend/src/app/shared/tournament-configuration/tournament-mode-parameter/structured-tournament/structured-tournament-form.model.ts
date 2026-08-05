import { FormControl, FormGroup } from '@angular/forms';

export type StructuredTournamentForm = FormGroup<{
  hasConsolanteTable: FormControl<boolean>;
  hasChallengePrincipaleTable: FormControl<boolean>;
  hasChallengeConsolanteTable: FormControl<boolean>;
  hasThirdPlaceMatch: FormControl<boolean>;

  principalBracketSize: FormControl<number | undefined>;
  numberOfQualifyingRounds: FormControl<number>;
  numberOfPools: FormControl<number | undefined>;
}>;
