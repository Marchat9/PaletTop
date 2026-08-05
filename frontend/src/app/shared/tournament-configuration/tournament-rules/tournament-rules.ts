import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { environment } from '@environment';
import { Card } from '../../card/card';
import { InputRange } from '../../input-range/input-range';
import { TournamentConfigurationField } from '../tournament-configuration-form.model';
import { TournamentRulesForm } from './tournament-rules-form.model';
import * as configuration from '../tournament-create.data';
import { InputCheckbox } from '../../input-checkbox/input-checkbox';
import { InputCardRadio } from '../../input-card-radio/input-card-radio';
import { Icon } from '../../icon/icon';

@Component({
  selector: 'app-tournament-rules',
  imports: [ReactiveFormsModule, Card, InputRange, InputCheckbox, InputCardRadio, Icon],
  templateUrl: './tournament-rules.html',
  styleUrls: ['../shared-config.scss', './tournament-rules.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TournamentRules {
  public readonly group = input.required<TournamentRulesForm>();
  public readonly readonlyFields = input<TournamentConfigurationField[]>([]);
  public readonly hiddenFields = input<TournamentConfigurationField[]>([]);

  public readonly maxTeamCapacity = environment.tournamentConfiguration.maxTeamCapacity;
  public readonly pointsPerGameOptions = configuration.pointsPerGameOptions;
  public readonly scoreCalculationOptions = configuration.scoreCalculationOptions;

  public readonly minPointsPerGame: number = environment.tournamentConfiguration.pointsPerGame.min;
  public readonly maxPointsPerGame: number = environment.tournamentConfiguration.pointsPerGame.max;
}
