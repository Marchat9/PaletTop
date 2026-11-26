import { FormControl, FormGroup } from '@angular/forms';
import { EliminationSeeding } from 'src/app/models/tournament-configuration-detail.model';

export type StructuredTournamentForm = FormGroup<{
  numberOfQualifyingRounds: FormControl<number>;
  consolationCount: FormControl<number>;
  hasChallenges: FormControl<boolean>;
  hasThirdPlaceMatch: FormControl<boolean>;
  eliminationSeeding: FormControl<EliminationSeeding>;
}>;
