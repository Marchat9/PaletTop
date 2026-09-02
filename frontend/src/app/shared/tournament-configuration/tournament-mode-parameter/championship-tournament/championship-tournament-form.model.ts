import { FormControl, FormGroup } from '@angular/forms';

export type ChampionshipTournamentForm = FormGroup<{
  homeTeam: FormControl<string>;
  awayTeam: FormControl<string>;
}>;
