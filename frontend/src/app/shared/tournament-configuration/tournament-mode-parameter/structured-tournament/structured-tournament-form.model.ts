import { FormControl, FormGroup } from '@angular/forms';
import { PairingMode } from 'src/app/models/tournament-configuration-detail.model';

export type StructuredTournamentForm = FormGroup<{
  numberOfQualifyingRounds: FormControl<number>;
  consolationCount: FormControl<number>;
  hasChallenges: FormControl<boolean>;
  hasThirdPlaceMatch: FormControl<boolean>;
  eliminationPairingMode: FormControl<PairingMode>;
}>;
