import { FormControl, FormGroup } from '@angular/forms';
import { PairingMode } from 'src/app/models/tournament-configuration-detail.model';

export type UpDownTournamentForm = FormGroup<{
  numberOfRound: FormControl<number | undefined>;
  lastRoundByRanking: FormControl<boolean>;
  pairingMode: FormControl<PairingMode>;
}>;
