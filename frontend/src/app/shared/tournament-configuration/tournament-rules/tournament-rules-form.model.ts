import { FormControl, FormGroup } from '@angular/forms';
import { ScoreCalculation } from 'src/app/models/tournament-configuration-detail.model';

export type TournamentRulesForm = FormGroup<{
  maxTeamCapacity: FormControl<number>;
  scoreCalculation: FormControl<ScoreCalculation>;
  pointsPerGame: FormControl<number>;

  rematch: FormControl<boolean>;
  matchAgainstFullSameClub: FormControl<boolean>;
  matchAgainstPartialSameClub: FormControl<boolean>;
}>;
