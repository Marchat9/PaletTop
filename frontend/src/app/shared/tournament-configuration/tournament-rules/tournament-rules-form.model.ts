import { FormControl, FormGroup } from '@angular/forms';

export type TournamentRulesForm = FormGroup<{
  maxTeamCapacity: FormControl<number>;
  pointsPerGame: FormControl<number>;

  rematch: FormControl<boolean>;
  matchAgainstFullSameClub: FormControl<boolean>;
  matchAgainstPartialSameClub: FormControl<boolean>;
}>;
