import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { InputText } from 'src/app/shared/input-text/input-text';
import { TournamentConfigurationField } from '../../tournament-configuration-form.model';
import { ChampionshipTournamentForm } from './championship-tournament-form.model';

@Component({
  selector: 'app-championship-tournament',
  imports: [ReactiveFormsModule, InputText],
  templateUrl: './championship-tournament.html',
  styleUrls: ['../../shared-config.scss', './championship-tournament.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChampionshipTournament {
  public readonly group = input.required<ChampionshipTournamentForm>();
  public readonly readonlyFields = input<TournamentConfigurationField[]>([]);
  public readonly hiddenFields = input<TournamentConfigurationField[]>([]);
}
